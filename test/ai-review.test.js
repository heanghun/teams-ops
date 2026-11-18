import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../server/worker.js';
import { localDb } from '../scripts/local-db.mjs';
import { dateOffset } from '../server/seed.js';

const people = {
  owner:'owner@example.test', estimator:'estimator@example.test',
  reviewer:'reviewer@example.test', field:'field@example.test',
};
const line = {section:'Mechanical',description:'Copper Pipe',spec:'DN20',unit:'m',quantity:12.5,source:'PDF p.2, item M1',review:''};
const review = {summary:'Compare against the approved scope.',findings:[{topic:'Scope',observation:'Check the pipe allowance.',source:'PDF p.2'}]};
const response = result => Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(result)}]}],
  usage:{input_tokens:1050,output_tokens:280}});
async function setup(t,overrides={}){
  const DB=localDb(),files=new Map();
  t.after(()=>DB.close());
  const env={DB,TEAMS_MODE:'team',TEAMS_OWNER_EMAIL:people.owner,TEAMS_AI_ENABLED:'true',
    TEAMS_OPENAI_API_KEY:'mock-only',TEAMS_OPENAI_MODEL:'test-model',
    BUCKET:{async put(id,body){files.set(id,await new Response(body).arrayBuffer());},async get(id){return files.has(id)?{body:files.get(id)}:null;},async delete(id){files.delete(id);}},
    ...overrides};
  function request(path,{actor='estimator',body,headers={}}={}){
    const auth=actor?{'oai-authenticated-user-id':actor,'oai-authenticated-user-email':people[actor]}:{};
    const form=body instanceof FormData;
    return worker.fetch(new Request('https://teams.test'+path,{method:body?'POST':'GET',headers:{...auth,...(body&&!form?{'Content-Type':'application/json'}:{}),...headers},
      body:form?body:body?JSON.stringify(body):undefined}),env);
  }
  async function action(action,data,actor='estimator',expected=200){
    const res=await request('/api/action',{actor,body:{action,data,key:crypto.randomUUID()}});
    const value=await res.json();
    assert.equal(res.status,expected,JSON.stringify(value));
    return value.id;
  }
  for(const [actor,role] of [['estimator','estimator'],['reviewer','manager'],['field','warehouse']]){
    await action('employee.upsert',{name:actor,email:people[actor],roles:[role],active:true},'owner');
  }
  const clientId=await action('client.create',{name:'Example Company'});
  const tender={name:'Workshop tender',clientId,currency:'USD',due:dateOffset(15),value:1000,cost:600,upfront:200,duration:2};
  const recordId=await action('tender.create',tender);
  const otherId=await action('tender.create',{...tender,name:'Unrelated tender'});
  async function attach(parentId,file=new File(['%PDF-1.7\nSynthetic fixture\n%%EOF'],'sample.pdf',{type:'application/pdf'})){
    const form=new FormData();
    form.set('parentId',parentId);form.set('key',crypto.randomUUID());form.set('file',file);
    const res=await request('/api/upload',{body:form}),result=await res.json();
    assert.equal(res.status,200,JSON.stringify(result));return result.id;
  }
  const attachmentId=await attach(recordId);
  function analyze(body={},options={}){
    return request('/api/ai/review',{body:{kind:'tender',recordId,attachmentId,language:'en',confirmed:true,...body},...options});
  }
  return {DB,env,request,action,analyze,attach,tender,clientId,recordId,attachmentId,otherId};
}

test('AI disclosure, role, origin, record and source selection are checked before provider use',async t=>{
  const c=await setup(t);
  const api=t.mock.method(globalThis,'fetch',async()=>response(review));
  assert.equal((await (await c.request('/api/state')).json()).aiReview,true);
  assert.equal((await (await c.request('/api/state',{actor:'field'})).json()).aiReview,false);
  assert.equal((await c.analyze({},{actor:null})).status,401);
  assert.equal((await c.analyze({},{actor:'field'})).status,403);
  assert.equal((await c.analyze({},{headers:{Origin:'https://unrelated.test'}})).status,403);
  assert.equal((await c.analyze({confirmed:false})).status,400);
  assert.equal((await c.analyze({recordId:c.otherId})).status,404);
  const invalidPdf=await c.attach(c.recordId,new File(['mislabeled'],'source.pdf',{type:'application/pdf'}));
  assert.equal((await c.analyze({attachmentId:invalidPdf})).status,415);
  const oversizedPdf=await c.attach(c.recordId,new File(['%PDF-',new Uint8Array(4_000_000)],'large.pdf',{type:'application/pdf'}));
  assert.equal((await c.analyze({attachmentId:oversizedPdf})).status,413);
  c.env.TEAMS_AI_ENABLED='false';
  assert.equal((await c.analyze()).status,403);
  c.env.TEAMS_MODE='public-demo';
  c.env.TEAMS_AI_ENABLED='true';
  assert.equal((await c.analyze()).status,404);
  assert.equal(api.mock.callCount(),0);
});

test('a reviewed PDF BOQ stays read-only until saved and catalog prices drive the approved-bid draft',async t=>{
  const c=await setup(t);
  await c.action('material.create',{code:'P-20',name:line.description,spec:line.spec,unit:line.unit,category:'MEP',price:7.25,priceDate:dateOffset(),currency:'USD'},'owner');
  const previous=await (await c.request('/api/state')).json();
  const provider=t.mock.method(globalThis,'fetch',async (url,options)=>{
    assert.equal(url,'https://api.openai.com/v1/responses');
    const body=JSON.parse(options.body);
    assert.equal(body.store,false);
    assert.equal(body.text.format.strict,true);
    assert.match(body.instructions,/Khmer/);
    assert.equal(body.input[0].content[0].type,'input_file');
    assert.match(body.input[0].content[0].file_data,/^data:application\/pdf;base64,/);
    assert.equal(body.tools,undefined);
    return response({...review,complete:true,lines:[line,{...line,quantity:null,review:'Unclear quantity'}]});
  });
  const attempt=await c.analyze({kind:'boq',language:'km'});
  assert.equal(attempt.status,200);
  assert.match(attempt.headers.get('Cache-Control'),/no-store/);
  const result=await attempt.json();
  assert.deepEqual(result.lines.map(item=>item.selectable),[true,false]);
  const after=await (await c.request('/api/state')).json();
  assert.equal(after.version,previous.version);
  assert.deepEqual(after.records,previous.records);
  const run=c.DB.prepare('SELECT status,kind,actor,input_tokens,output_tokens FROM ai_review_runs').first();
  assert.deepEqual({...run},{status:'completed',kind:'boq',actor:'estimator',input_tokens:1050,output_tokens:280});
  assert.equal((await c.analyze({kind:'boq'})).status,429);
  assert.equal(provider.mock.callCount(),1);
  const saved={...c.tender,id:c.recordId,aiBoqDocumentId:c.attachmentId,boq:[{...line,sourceRef:'sample.pdf / '+line.source}]};
  await c.action('tender.update',saved);
  await c.action('tender.update',saved,'estimator',409);
  for(const status of ['Under Evaluation','Pending Review','Approved for Bid']){
    await c.action('tender.transition',{id:c.recordId,status,reason:'Separate authorized test reviewer'},'reviewer');
  }
  const quotation=await (await c.request('/api/tender-estimate?id='+c.recordId)).json();
  assert.equal(quotation.ready,true);
  assert.equal(quotation.quote.items[0].quantity,12.5);
  assert.equal(quotation.quote.items[0].material,7.25);
  assert.equal(quotation.quote.items[0].sourceRef,saved.boq[0].sourceRef);
});

test('quotation review omits rate fields and incomplete provider responses consume a capped attempt',async t=>{
  const c=await setup(t,{TEAMS_AI_DAILY_LIMIT:'1'});
  const quoteId=await c.action('quote.create',{clientId:c.clientId,name:'Synthetic quotation',currency:'USD',margin:20,tax:0,
    validUntil:dateOffset(15),items:[{description:'Pipe',unit:'m',quantity:5,material:99.99,override:'Test price evidence'}]});
  const provider=t.mock.method(globalThis,'fetch',async (url,options)=>{
    const reviewBody=JSON.parse(options.body);
    const content=JSON.parse(reviewBody.input[0].content[0].text);
    assert.equal(content.quotation.items[0].quantity,5);
    assert.equal(content.quotation.items[0].material,undefined);
    assert.equal(content.quotation.totals,undefined);
    assert.equal(content.approvedTender,null);
    return Response.json({status:'incomplete',output:[],usage:{input_tokens:720,output_tokens:4000}});
  });
  const result=await c.analyze({kind:'quote',recordId:quoteId,attachmentId:''});
  assert.equal(result.status,502);
  assert.match((await result.json()).error,/incomplete review/);
  assert.equal(c.DB.prepare('SELECT status FROM ai_review_runs').first().status,'failed');
  assert.equal((await c.analyze({},{actor:'reviewer'})).status,429);
  assert.equal(provider.mock.callCount(),1);
});
