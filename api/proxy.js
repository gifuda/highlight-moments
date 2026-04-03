/* ============================================
   Vercel Serverless Function — 坚果云 WebDAV CORS 代理
   国内可访问，免费部署

   部署步骤：
   1. 打开 https://vercel.com 用 GitHub 登录
   2. Add New → Project → Import highlight-moments 仓库
   3. Framework Preset 选 Other → Deploy
   4. 部署完成后获得 URL（如 https://highlight-moments.vercel.app）
   5. 代理地址填入：https://highlight-moments.vercel.app/api/proxy
   ============================================ */

export default async function handler(req) {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  const auth = req.headers.get('Authorization');
  if (!auth) {
    return jsonResponse({ error: '缺少认证信息' }, 401);
  }

  // 转发路径：/api/proxy/xxx → https://dav.jianguoyun.com/dav/xxx
  const url = new URL(req.url);
  const targetPath = '/dav' + url.pathname.replace('/api/proxy', '');
  const targetUrl = 'https://dav.jianguoyun.com' + targetPath;

  const fwdHeaders = {
    'Authorization': auth,
    'Content-Type': req.headers.get('Content-Type') || 'application/xml',
  };
  if (req.headers.get('Depth') !== null) {
    fwdHeaders['Depth'] = req.headers.get('Depth');
  }

  // GET/HEAD 不发 body
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer();

  try {
    const resp = await fetch(targetUrl, {
      method: req.method,
      headers: fwdHeaders,
      body,
    });

    const respHeaders = new Headers(resp.headers);
    respHeaders.set('Access-Control-Allow-Origin', '*');
    respHeaders.set('Access-Control-Allow-Methods', 'GET, PUT, DELETE, PROPFIND, MKCOL, OPTIONS');
    respHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Depth');
    // 移除可能导致问题的头
    respHeaders.delete('content-encoding');

    return new Response(resp.body, {
      status: resp.status,
      headers: respHeaders,
    });
  } catch (err) {
    return jsonResponse({ error: '代理请求失败: ' + err.message }, 502);
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, PROPFIND, MKCOL, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Depth',
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}
