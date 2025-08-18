const cache_name = 'gestao-aulas-cache-v2';
const cache_exp = 1000 //1000*60*60*24; //24 hours cache_exp
const cache_resources = [
  './',
  'style.css',
  'script.js',
  'favicon.png',
  'manifest.json'
];

//install event to pre-cache all initial resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(cache_name)
      .then(cache => cache.addAll(cache_resources))
  );
});

// self.addEventListener('fetch', event => {
//   event.respondWith(
//     caches.match(event.request)
//       .then(response => {
//         if (response) return response
//         return fetch(event.request);
//       })
//   );
// });

//fetch event to serve from cache and update if expired
self.addEventListener('fetch', event => {
 console.log('Service worker: fetch event intercepted for ', event.request.url);
 event.respondWith((async () => {
  let cache = await caches.open(cache_name);
  let cachedResponse = await cache.match(event.request);

  if (cachedResponse && !(await isExpired(cachedResponse))) {
   console.log('Service worker: fetch event serving cached resource at ', event.request.url);
   return cachedResponse;
  }

  console.log(`Service worker: fetch event resource is ${cachedResponse?'expired':'not in cache'} - will try to serve from web at ${event.request.url}`);
  return updateCache(event.request) || new Response('Network error occurred',{status:408});
 })());
});

//check if cached resource is expired
async function isExpired(cachedResponse){
 let dateHeader = cachedResponse.headers.get('date');
 if(dateHeader){
  let cacheDate = new Date(dateHeader).getTime();
  return Date.now() - cacheDate > cache_exp;
 }
 return true; //treat as expired if date header is missing
}

//update a resource in the cache
async function updateCache(request){
 let cache = await caches.open(cache_name);
 try{
  let fetchResponse = await fetch(request);
  await cache.put(request, fetchResponse.clone());
  console.log(`Service worker: updated cached resource: ${request.url}`);
  return fetchResponse;
 }catch(e){
  console.log(`Service worker: failed to update resource: ${request.url}\nError:`, e);
  return cache.match(request);	//return the outdated cache in case of failure
 }
}

//activate event to update outdated cached resources
self.addEventListener('activate', event => {
 event.waitUntil((async () => {
  let cache = await caches.open(cache_name);
  let cachedRequests = await cache.keys();
  for(let request of cachedRequests){
   let cachedResponse = await cache.match(request);
   if(await isExpired(cachedResponse)){
    console.log(`Service worker: activate event detected outdated resource detected: ${request.url}`);
    await updateCache(request);
   }
  }
 })());
});


