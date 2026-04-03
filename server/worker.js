/* ============================================
   Cloudflare Worker — 坚果云 WebDAV CORS 代理
   部署后获得公网 URL，所有设备都能访问

   部署步骤：
   1. 注册 https://dash.cloudflare.com （免费）
   2. 左侧菜单 → Workers & Pages → 创建 Worker
   3. 把本文件内容粘贴到编辑器 → 保存并部署
   4. 复制分配的 URL（如 https://xxx.workers.dev）
   5. 在高光时刻设置中，代理地址填入该 URL + /proxy
      例如：https://xxx.workers.dev/proxy
   ============================================ */

export default {
  async fetch(request) {
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, PUT, DELETE, PROPFIND, MKCOL, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Depth',
        },
      });
    }

    // 从请求头获取认证信息
    const auth = request.headers.get('Authorization');
    if (!auth) {
      return new Response(JSON.stringify({ error: '缺少认证信息' }), {
        status: 401,
        headers: corsHeaders(),
      });
    }

    // 转发路径：/proxy/xxx → https://dav.jianguoyun.com/dav/xxx
    const url = new URL(request.url);
    const targetPath = '/dav' + url.pathname.replace('/proxy', '');

    // 构建转发请求头
    const fwdHeaders = {
      'Authorization': auth,
      'Content-Type': request.headers.get('Content-Type') || 'application/xml',
    };
    if (request.headers.get('Depth') !== null) {
      fwdHeaders['Depth'] = request.headers.get('Depth');
    }

    // 获取请求体
    const body = request.method !== 'GET' && request.method !== 'HEAD'
      ? await request.arrayBuffer()
      : null;

    // 转发到坚果云
    const targetUrl = 'https://dav.jianguoyun.com' + targetPath + url.search;
    const resp = await fetch(targetUrl, {
      method: request.method,
      headers: fwdHeaders,
      body: body,
    });

    // 返回结果（加 CORS 头）
    const respHeaders = new Headers(resp.headers);
    respHeaders.set('Access-Control-Allow-Origin', '*');
    respHeaders.set('Access-Control-Allow-Methods', 'GET, PUT, DELETE, PROPFIND, MKCOL, OPTIONS');
    respHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Depth');

    return new Response(resp.body, {
      status: resp.status,
      headers: respHeaders,
    });
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, PROPFIND, MKCOL, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Depth',
  };
}
