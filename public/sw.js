self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    if (url.origin !== location.origin) {
        event.respondWith(handleProxyFetch(event.request, url));
    }
});

async function handleProxyFetch(request, url) {
    const sessionId = await getSessionId();
    const proxiedUrl = `/proxy/${encodeURIComponent(url.href)}`;
    
    const headers = new Headers(request.headers);
    headers.set('X-Session-Id', sessionId);
    
    return fetch(proxiedUrl, {
        method: request.method,
        headers: headers,
        body: request.method !== 'GET' ? request.body : null
    });
}

async function getSessionId() {
    const cache = await caches.open('ar-session');
    const cached = await cache.match('session-id');
    
    if (cached) {
        return cached.text();
    }
    
    const response = await fetch('/api/session/create', { method: 'POST' });
    const data = await response.json();
    
    await cache.put('session-id', new Response(data.sessionId));
    return data.sessionId;
}