/* ============================================
   本地中转服务
   转发浏览器请求到坚果云 WebDAV，解决 CORS 限制
   启动方式：node server/proxy.js
   ============================================ */

const http = require('http');
const https = require('https');

const PORT = 3001;
const DAV_URL = 'https://dav.jianguoyun.com';

const server = http.createServer((req, res) => {
  // 允许所有跨域请求
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, PROPFIND, MKCOL, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Depth');

  // 预检请求直接返回
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 从请求头获取认证信息
  const auth = req.headers['authorization'];
  if (!auth) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '缺少认证信息' }));
    return;
  }

  // 转发路径：/proxy/xxx → https://dav.jianguoyun.com/dav/xxx
  const targetPath = '/dav' + req.url.replace('/proxy', '');

  // 收集请求体
  let body = [];
  req.on('data', chunk => body.push(chunk));
  req.on('end', () => {
    body = Buffer.concat(body);

    const options = {
      hostname: 'dav.jianguoyun.com',
      port: 443,
      path: targetPath,
      method: req.method,
      headers: {
        'Authorization': auth,
        'Content-Type': req.headers['content-type'] || 'application/xml',
        'Content-Length': body.length
      }
    };

    // Depth 头（WebDAV PROPFIND 需要）
    if (req.headers['depth'] !== undefined) {
      options.headers['Depth'] = req.headers['depth'];
    }

    const proxyReq = https.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('代理请求失败:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '代理请求失败: ' + err.message }));
    });

    if (body.length > 0) proxyReq.write(body);
    proxyReq.end();
  });
});

server.listen(PORT, () => {
  console.log(`🚀 中转服务已启动: http://localhost:${PORT}`);
  console.log(`   坚果云 WebDAV 代理路径: http://localhost:${PORT}/proxy/`);
});
