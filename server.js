const http = require('http');
const fs = require('fs');
const path = require('path');
const ActualRoute = require('./actualroute/index.js');

const ar = new ActualRoute('./ar.config.js');

const server = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        
        if (url.pathname.startsWith('/proxy/')) {
            await handleProxy(req, res, url);
        } else if (url.pathname.startsWith('/api/')) {
            await handleApi(req, res, url);
        } else if (url.pathname === '/wisp/') {
            await handleWisp(req, res);
        } else if (url.pathname.startsWith('/ws/')) {
            await handleWebSocket(req, res, url);
        } else {
            serveStatic(req, res, url);
        }
    } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
    }
});

async function handleProxy(req, res, url) {
    let body = null;
    
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        body = await readBody(req);
    }
    
    const targetUrl = decodeURIComponent(url.pathname.replace('/proxy/', ''));
    const sessionId = req.headers['x-session-id'] || url.searchParams.get('session');
    
    const requestObj = {
        url: targetUrl,
        method: req.method,
        headers: req.headers,
        body: body
    };
    
    const result = await ar.route(requestObj, sessionId);
    
    res.writeHead(result.status || 200, result.headers || {});
    
    if (result.body && typeof result.body.pipe === 'function') {
        result.body.pipe(res);
    } else {
        res.end(result.body || '');
    }
}

async function handleApi(req, res, url) {
    if (req.method === 'POST' && url.pathname === '/api/session/create') {
        const sessionId = ar.sessions ? ar.sessions.createSession() : null;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sessionId }));
        return;
    }
    
    if (req.method === 'POST' && url.pathname === '/api/session/export') {
        const body = await readBody(req);
        const { sessionId } = JSON.parse(body);
        const data = ar.sessions ? ar.sessions.export(sessionId) : null;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
        return;
    }
    
    if (req.method === 'POST' && url.pathname === '/api/session/import') {
        const body = await readBody(req);
        const data = JSON.parse(body);
        const sessionId = ar.sessions ? ar.sessions.import(data) : null;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sessionId }));
        return;
    }
    
    if (req.method === 'POST' && url.pathname === '/api/session/storage/get') {
        const body = await readBody(req);
        const { sessionId, key } = JSON.parse(body);
        const value = ar.storage ? ar.storage.get(sessionId, key) : null;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ value }));
        return;
    }
    
    if (req.method === 'POST' && url.pathname === '/api/session/storage/set') {
        const body = await readBody(req);
        const { sessionId, key, value } = JSON.parse(body);
        const success = ar.storage ? ar.storage.set(sessionId, key, value) : false;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success }));
        return;
    }
    
    if (req.method === 'POST' && url.pathname === '/api/session/storage/remove') {
        const body = await readBody(req);
        const { sessionId, key } = JSON.parse(body);
        if (ar.storage) ar.storage.remove(sessionId, key);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
    }
    
    res.writeHead(404);
    res.end('Not Found');
}

async function handleWisp(req, res) {
    const WebSocket = require('ws');
    const wss = new WebSocket.Server({ noServer: true });
    
    wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
        ws.on('message', (data) => {
            // Wisp packet handling
        });
        
        ws.on('close', () => {
            // Cleanup
        });
    });
}

async function handleWebSocket(req, res, url) {
    const targetUrl = decodeURIComponent(url.pathname.replace('/ws/', ''));
    const WebSocket = require('ws');
    const parsed = new URL(targetUrl);
    const wsUrl = `ws://${parsed.hostname}:${parsed.port || 80}${parsed.pathname}${parsed.search}`;
    
    const wss = new WebSocket.Server({ noServer: true });
    
    wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
        const targetWs = new WebSocket(wsUrl);
        
        targetWs.on('open', () => {
            ws.on('message', (data) => {
                targetWs.send(data);
            });
        });
        
        targetWs.on('message', (data) => {
            ws.send(data);
        });
        
        ws.on('close', () => {
            targetWs.close();
        });
        
        targetWs.on('close', () => {
            ws.close();
        });
    });
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}

function serveStatic(req, res, url) {
    let filePath = path.join(__dirname, 'public', url.pathname);
    
    if (url.pathname === '/') {
        filePath = path.join(__dirname, 'public', 'index.html');
    }
    
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end('Not Found');
        return;
    }
    
    const ext = path.extname(filePath);
    const mimeTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.mp3': 'audio/mpeg'
    };
    
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
}

server.listen(ar.config.server.port, ar.config.server.host, () => {
    console.log(`[AR Demo] Server running on http://${ar.config.server.host}:${ar.config.server.port}`);
    console.log(`[AR Demo] Mode: ${ar.getMode()}`);
});