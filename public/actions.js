// Page/layout metadata (for example html[data-view]) is not a clickable action.
// Keep delegated commands on real buttons, plus the existing record queue rows.
const actionAttributes=['view','cmd','open','export','queue','file','service','step','unit','demo-role'];
const actionSelector=actionAttributes.map(name=>'button[data-'+name+']').concat('tr[data-open]').join(',');
export function findActionControl(target){
  const element=target?.nodeType===1?target:target?.parentElement;
  const control=element?.closest?.(actionSelector);
  if(!control||control.disabled||control.getAttribute('aria-disabled')==='true')return null;
  // An independent editor inside a record row must keep its own native behavior.
  if(control.tagName==='TR'&&element.closest('input,select,textarea,button,a,[contenteditable]'))return null;
  return control;
}
