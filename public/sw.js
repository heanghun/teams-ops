// Only public application assets are cached. Never cache records, identity, uploads or API responses.
const CACHE='teams-shell-__TEAMS_BUILD__';
const ASSETS=__TEAMS_ASSETS__;
const SAFE=new Set(ASSETS);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'}))))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('teams-shell-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/signin')||url.pathname.startsWith('/signout'))return;
  if(req.mode==='navigate'){
    // A cold offline launch shows guidance. It cannot reuse another user's business state or submit changes.
    event.respondWith(fetch(req).catch(async()=>await caches.match('/offline.html')||new Response('Offline. Reconnect to TEAMS.',{status:503,headers:{'Content-Type':'text/plain'}})));return;
  }
  if(!SAFE.has(url.pathname+url.search))return;
  event.respondWith((async()=>{const cache=await caches.open(CACHE),stored=await cache.match(req);return stored||fetch(req);})());
});
