import test from 'node:test';
import assert from 'node:assert/strict';
import { DOMParser } from 'linkedom';
import { readBoq } from '../public/boq.js';
import { masterImports, masterImportTemplate, mapMasterHeaders, guessMasterHeader } from '../public/master-import.js';
import { applyOperation } from '../server/domain.js';
import { initialRecords } from '../server/seed.js';

test('every Excel import template opens in the importer and documents a valid MD import',async()=>{
  globalThis.DOMParser=DOMParser;
  const director={id:'director',demo:false,roles:['director']},today='2026-11-19';
  let rows=initialRecords(false);
  const save=(action,data)=>{
    const {target,changes}=applyOperation(rows,director,action,data,false,today);
    const updated=new Map(rows.map(row=>[row.id,row]));
    for(const row of changes)updated.set(row.id,row);
    rows=[...updated.values()];
    return target;
  };
  const warehouse=save('warehouse.create',{code:'WH-MAIN',name:'Example Warehouse',location:'Example site'});
  assert.throws(()=>save('supplier.create',{name:'Direct create outside MD powers'}),{status:403});

  for(const [type,{columns}] of Object.entries(masterImports)){
    const filename='import-'+type+'.xlsx';
    const sheets=await readBoq(new File([masterImportTemplate(type,['estimator'])],filename));
    assert.deepEqual(sheets.map(sheet=>sheet.name),['Data','Instructions']);
    assert.equal(sheets[0].rows.length,1,'Data must start blank');
    const header=sheets[0].rows[0];
    assert.deepEqual(header,columns.map(column=>column.label));
    const mapping=mapMasterHeaders(type,header);
    assert.equal(Object.keys(mapping).length,columns.length);
    const guide=sheets[1].rows;
    const examples=new Map(guide.slice(guide.findIndex(row=>row[0]==='Column')+1).map(([label,,example])=>[label,example]));
    const sample=Object.fromEntries(Object.entries(mapping).map(([key,index])=>[key,examples.get(header[index])]));
    const result=save('master.import',{type,source:filename,entries:[sample],...(type==='opening'?{cutoff:today}:{})});
    assert.equal(result.count,1,type);
  }
  const employee=rows.find(row=>row.kind==='employee');
  assert.equal(employee.employeeId,'00045');
  assert.equal(employee.active,false);
  assert.equal(rows.find(row=>row.kind==='movement'&&row.opening).warehouseId,warehouse.id);
});

test('supplier header suggestion handles title rows and common source column names',()=>{
  const rows=[['LIST OF SUPPLIERS'],['Version 1'],['N.','Vendor Name','Email address','Telephone','Credit terms'],['1','Example','sales@example.test','012345678','Net 30']];
  assert.equal(guessMasterHeader('supplier',rows),2);
  assert.deepEqual(mapMasterHeaders('supplier',rows[2]),{name:1,email:2,phone:3,terms:4});
});
