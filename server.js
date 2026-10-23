const http = require('http');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Load .env file locally if it exists and UNSPLASH_API_KEY is not already in process.env
if (!process.env.UNSPLASH_API_KEY) {
    if (typeof process.loadEnvFile === 'function' && fs.existsSync(path.join(__dirname, '.env'))) {
        try {
            process.loadEnvFile(path.join(__dirname, '.env'));
        } catch (_) {}
    } else if (fs.existsSync(path.join(__dirname, '.env'))) {
        try {
            const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
            for (const line of envContent.split('\n')) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    const idx = trimmed.indexOf('=');
                    if (idx !== -1) {
                        const key = trimmed.slice(0, idx).trim();
                        const val = trimmed.slice(idx + 1).trim();
                        if (!process.env[key]) {
                            process.env[key] = val;
                        }
                    }
                }
            }
        } catch (_) {}
    }
}

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const STATIC_ROOT = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
};

async function handleUnsplash(req, res, parsedUrl) {
    const query = parsedUrl.searchParams.get('query') || '';
    const apiKey = process.env.UNSPLASH_API_KEY;

    if (!apiKey) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'UNSPLASH_API_KEY is not configured on the server' }));
        return;
    }

    try {
        const response = await axios.get('https://api.unsplash.com/photos/random', {
            params: { query },
            headers: { Authorization: `Client-ID ${apiKey}` }
        });
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(response.data));
    } catch (error) {
        const status = error.response ? error.response.status : 500;
        const msg = error.response && error.response.data ? error.response.data : { error: 'Failed to fetch from Unsplash' };
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(msg));
    }
}

const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // Handle Unsplash API endpoint (supports both Netlify function path and /api/unsplash)
    if (pathname === '/.netlify/functions/fetchUnsplash' || pathname === '/api/unsplash') {
        return handleUnsplash(req, res, parsedUrl);
    }

    // Static file serving
    let safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[\/\\])+/, '');
    if (safePath === '/' || safePath === '\\') {
        safePath = '/index.html';
    }

    const filePath = path.join(STATIC_ROOT, safePath);

    // Prevent directory traversal outside STATIC_ROOT
    if (!filePath.startsWith(STATIC_ROOT)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    });
});

server.listen(PORT, HOST, () => {
    console.log(`Duotone server running at http://${HOST}:${PORT}`);
});
