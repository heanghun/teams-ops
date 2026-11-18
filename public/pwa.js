import { translate, translateInterface } from './localization.js';
let deferredInstall=null,registration=null,reloading=false;
export function installHelp(){return '<p>Use TEAMS from your Home screen.</p><h3>Android / Chrome</h3><p>Tap Install app, then confirm the browser installation prompt. You can also use the browser menu and choose Install app or Add to Home screen.</p><h3>iPhone / iPad</h3><p>Open this address in Safari. Tap Share, choose Add to Home Screen, then Add.</p><h3>Connection required</h3><p>Live records, approvals, stock updates and email require an internet connection. Nothing is queued for automatic submission.</p>';}

export async function promptInstall(){if(!deferredInstall)return false;const event=deferredInstall;deferredInstall=null;await event.prompt();await event.userChoice;return true;}
export function applyAppUpdate(){if(!registration?.waiting)return;if(!confirm(translate('Update and reload? Save or finish any open work first.')))return;reloading=true;registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});}
export function initPwa(){
  const connection=()=>{const el=document.getElementById('connection-banner');if(!el)return;el.hidden=navigator.onLine;el.textContent=translate('Offline. Reconnect before submitting operational changes.');document.documentElement.classList.toggle('is-offline',!navigator.onLine);};
  window.addEventListener('offline',connection);window.addEventListener('online',connection);document.addEventListener('teams:language',connection);connection();
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstall=event;});
  window.addEventListener('appinstalled',()=>{deferredInstall=null;document.documentElement.classList.add('app-installed');});
  if(matchMedia('(display-mode: standalone)').matches||navigator.standalone)document.documentElement.classList.add('app-installed');
  if(!('serviceWorker' in navigator)||!window.isSecureContext)return;
  navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(value=>{
    registration=value;
    const ready=()=>{if(!registration.waiting)return;document.getElementById('update-banner').hidden=false;translateInterface(document.getElementById('update-banner'));};ready();
    registration.addEventListener('updatefound',()=>{const next=registration.installing;next?.addEventListener('statechange',()=>{if(next.state==='installed'&&navigator.serviceWorker.controller)ready();});});
  }).catch(()=>{/* Installation is optional; the online application remains usable. */});
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)location.reload();});
}
