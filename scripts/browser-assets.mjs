import { createHash } from 'node:crypto';

function versionScript(script,assets,buildId){
  return script.replace(/(['"])(\.{1,2}\/[^'"\n]+\.m?js)\1/g,(_,quote,url)=>quote+url+'?v='+buildId+quote)
    .replace(/(['"])(\/[^'"\n?]+\.m?js)\1/g,(match,quote,url)=>Object.hasOwn(assets,url)?quote+url+'?v='+buildId+quote:match);
}

// Version the complete browser module graph so an older installed service worker
// cannot pair a new HTML document with cached scripts from a previous release.
export function versionBrowserAssets(assets,buildId){
  if(!/^[a-f0-9]{16}$/.test(buildId))throw Error('Invalid browser build identifier');
  const result={};
  for(const [path,asset]of Object.entries(assets)){
    if(typeof asset!=='string'){result[path]=asset;continue;}
    if(/\.m?js$/.test(path))result[path]=versionScript(asset,assets,buildId);
    else if(path==='/'||path.endsWith('.html'))result[path]=asset.replace(/((?:src|href)=["'])(\/[^"']+\.(?:m?js|css))(["'])/g,(_,prefix,url,suffix)=>prefix+url+'?v='+buildId+suffix);
    else result[path]=asset;
  }
  const precache=Object.keys(result).filter(path=>path!=='/'&&path!=='/deployment-guide.html').map(path=>/\.(?:m?js|css)$/.test(path)?path+'?v='+buildId:path);
  return {assets:result,precache};
}

export function embedBrowserStartup(assets,bundledScript,buildId){
  const script=versionScript(bundledScript,assets,buildId);
  const page=assets['/'],stylesheet=assets['/style.css'];
  const scriptTag=`<script type="module" src="/app.js?v=${buildId}"></script>`;
  const styleTag=`<link rel="stylesheet" href="/style.css?v=${buildId}">`;
  if(!page.includes(scriptTag)||!page.includes(styleTag))throw new Error('The production page is missing its startup script or stylesheet tag.');
  if(/<\/script\b/i.test(script)||/<\/style\b/i.test(stylesheet))throw new Error('The production startup assets contain an inline closing tag.');
  const html=page.replace(styleTag,()=>`<style>${stylesheet}</style>`)
    .replace(scriptTag,()=>`<script type="module">${script}</script>`);
  return {html,scriptHash:createHash('sha256').update(script).digest('base64')};
}
