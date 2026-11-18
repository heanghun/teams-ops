import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { parseHTML } from 'linkedom';
import { findActionControl } from '../public/actions.js';

const source=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
// Exercise the real shared click handler, not a duplicate test implementation.
const clickHandler=source.slice(source.indexOf("document.addEventListener('click',event=>{"),source.indexOf("window.addEventListener('hashchange'"));
function fixture(){
  const {document,Event}=parseHTML('<!doctype html><html data-view="clients"><body><div id="search-results"></div><dialog id="modal" open><form id="active-form">'+
    '<label id="label">Company <span id="label-text">name</span><input id="text" name="name"></label>'+
    '<input id="number" type="number"><input id="date" type="date"><input id="file" type="file"><input id="check" type="checkbox">'+
    '<select id="select"><option id="option">Client</option></select><textarea id="textarea"></textarea><div id="editor" contenteditable="true">Draft message</div>'+
    '<button id="line" type="button">Add line</button><button id="submit" type="submit">Save</button><p id="blank">Form help</p>'+
    '</form><button id="cancel" data-cmd="close"><svg><path id="icon"></path></svg></button></dialog>'+
    '<button id="navigate" data-view="projects"><span id="nav-text">Projects</span></button><button id="disabled" data-view="home" disabled>Disabled</button>'+
    '<table><tbody><tr id="row" data-open="p0"><td><span id="row-text">Project</span><input id="row-input"><button id="row-editor">Edit line</button><button id="record" data-open="p1">Open</button></td></tr></tbody></table></body></html>');
  const actions=[],modal=document.getElementById('modal');Object.defineProperty(modal,'open',{get:()=>modal.hasAttribute('open')});
  runInNewContext(clickHandler,{document,findActionControl,$:selector=>document.querySelector(selector),modal,state:{},closeModal:()=>{actions.push(['close']);modal.removeAttribute('open');return true;},navigate:view=>actions.push(['navigate',view]),openRecord:id=>actions.push(['record',id]),exportFile:url=>actions.push(['export',url]),URLSearchParams});
  const click=id=>document.getElementById(id).dispatchEvent(new Event('click',{bubbles:true}));return {document,Event,modal,actions,click};
}

test('real delegated handler leaves every native form control and non-command button open under html[data-view]',()=>{
  const f=fixture();let lineClicks=0,saveClicks=0;
  f.document.getElementById('line').addEventListener('click',()=>lineClicks++);f.document.getElementById('submit').addEventListener('click',()=>saveClicks++);
  for(const id of ['text','number','date','file','check','select','option','textarea','editor','label','label-text','line','submit','blank']){
    f.click(id);assert.equal(f.modal.open,true,id+' closed the dialog');assert.deepEqual(f.actions,[],id+' triggered a global command');
  }
  assert.equal(lineClicks,1);assert.equal(saveClicks,1);
  assert.equal(findActionControl(f.document.documentElement),null);assert.equal(findActionControl(f.document.body),null);
});

test('nested icons still close explicitly and navigation buttons still navigate exactly once',()=>{
  const f=fixture();f.click('icon');assert.equal(f.modal.open,false);assert.deepEqual(f.actions,[['close']]);
  const g=fixture();g.click('nav-text');assert.deepEqual(g.actions,[['close'],['navigate','projects']]);
  const h=fixture();h.click('disabled');assert.deepEqual(h.actions,[]);assert.equal(h.modal.open,true);
});

test('queue rows and record buttons retain record opening while embedded editors do not trigger it',()=>{
  const f=fixture();f.click('row-text');f.click('record');assert.deepEqual(f.actions,[['record','p0'],['record','p1']]);
  f.click('row-input');f.click('row-editor');assert.equal(f.actions.length,2);
});

test('all existing delegated button action families resolve and layout markers never resolve',()=>{
  const f=fixture();
  for(const name of ['view','cmd','open','export','queue','file','service','step','unit','demo-role']){
    const wrapper=f.document.createElement('section');wrapper.setAttribute('data-'+name,'layout');
    const button=f.document.createElement('button');button.setAttribute('data-'+name,'action');const span=f.document.createElement('span');span.textContent='Action';button.append(span);wrapper.append(button);f.document.body.append(wrapper);
    assert.equal(findActionControl(span),button,name);assert.equal(findActionControl(wrapper),null,name+' metadata');
  }
});
