const http = require('http');
const fs = require('fs');
const path = require('path');
const ActualRoute = require('./actualroute/index.js');

const ar = new ActualRoute('./ar.config.js');

const server = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        
        if (url.pathname.startsWith('/proxy/')) {
            const targetUrl = decodeURIComponent(url.pathname.replace('/proxy/', ''));
            const sessionId = req.headers['x-session-id'] || url.searchParams.get('session');
            
            const result = await ar.route({
                url: targetUrl,
                method: req.method,
                headers: req.headers,
                body: req.method === 'POST' ? req : null
            }, sessionId);
            
            res.writeHead(result.status, result.headers || {});
            
            if (result.body && typeof result.body.pipe === 'function') {
                result.body.pipe(res);
            } else {
                res.end(result.body || '');
            }
        } else {
            serveStatic(req, res, url);
        }
    } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
    }
});

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
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
    };
    
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
}

server.listen(ar.config.server.port, ar.config.server.host, () => {
    console.log(`[AR Demo] Server running on http://${ar.config.server.host}:${ar.config.server.port}`);
    console.log(`[AR Demo] Mode: ${ar.getMode()}`);
});