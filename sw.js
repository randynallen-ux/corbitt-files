/* The Corbitt Files — offline service worker.
   The whole app is one HTML file, so this is deliberately simple:
   precache the shell, serve from cache first so it opens instantly and works
   with no signal, and quietly refresh the cache in the background when there
   is a connection. Bump CACHE when the app changes. */

const CACHE = "corbitt-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c){ return c.addAll(ASSETS); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys()
      .then(function(keys){
        return Promise.all(keys.map(function(k){
          return k === CACHE ? null : caches.delete(k);
        }));
      })
      .then(function(){ return self.clients.claim(); })
  );
});

function refresh(req){
  return fetch(req).then(function(res){
    if(res && res.status === 200 && res.type === "basic"){
      const copy = res.clone();
      caches.open(CACHE).then(function(c){ c.put(req, copy); });
    }
    return res;
  });
}

self.addEventListener("fetch", function(e){
  const req = e.request;
  if(req.method !== "GET") return;
  if(new URL(req.url).origin !== self.location.origin) return;

  // Navigations always resolve to the cached page when offline, whatever the
  // URL looked like, so a home-screen launch never lands on an error.
  if(req.mode === "navigate"){
    e.respondWith(
      caches.match("./index.html").then(function(hit){
        const net = refresh(req).catch(function(){ return hit; });
        return hit || net;
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function(hit){
      const net = refresh(req).catch(function(){ return hit; });
      return hit || net;
    })
  );
});
