/* ============================================
   WebDAV 云盘提供商实现
   支持任何 WebDAV 兼容服务：
   - 坚果云、Nextcloud、ownCloud、群晖、私有云等
   - 用户可自定义服务器地址和本地代理地址
   ============================================ */

class WebDAVProvider extends CloudProvider {
  constructor(config) {
    super(config);
    this.serverUrl = config.serverUrl || 'https://dav.jianguoyun.com/dav';
    this.proxyUrl = config.proxyUrl || '';
    this.username = config.username;
    this.password = config.password;
    this.authHeader = 'Basic ' + btoa(this.username + ':' + this.password);
  }

  /* 构建实际请求 URL */
  _buildUrl(path) {
    // 如果有代理地址，走代理；否则直连（需要服务器本身支持 CORS）
    if (this.proxyUrl) {
      return this.proxyUrl + path;
    }
    return this.serverUrl + path;
  }

  /* 发起请求 */
  _request(method, path, body = null, extraHeaders = {}) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, this._buildUrl(path), true);
      xhr.setRequestHeader('Authorization', this.authHeader);
      xhr.setRequestHeader('Content-Type', 'application/json');
      for (const [k, v] of Object.entries(extraHeaders)) {
        xhr.setRequestHeader(k, v);
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.responseText);
        } else {
          reject(new Error(`WebDAV ${method} 失败: ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('网络错误，请确认代理服务已启动或服务器允许跨域访问'));
      xhr.send(body);
    });
  }

  /* 确保 /highlight-moments/ 目录存在 */
  async ensureBaseDir() {
    try { await this._request('MKCOL', '/highlight-moments'); } catch (e) {}
    try { await this._request('MKCOL', '/highlight-moments/records'); } catch (e) {}
    try { await this._request('MKCOL', '/highlight-moments/media'); } catch (e) {}
  }

  /* 测试连接 */
  async testConnection() {
    try {
      await this._request('PROPFIND', '/', null, { 'Depth': '0' });
      await this.ensureBaseDir();
      return true;
    } catch (err) {
      throw new Error('连接失败: ' + err.message);
    }
  }

  /* 保存记录 */
  async saveRecord(record) {
    await this.ensureBaseDir();
    await this._request('PUT', `/highlight-moments/records/${record.id}.json`, JSON.stringify(record));
  }

  /* 获取所有记录 */
  async getAllRecords() {
    await this.ensureBaseDir();
    const xml = await this._request('PROPFIND', '/highlight-moments/records/', null, { 'Depth': '1' });
    const fileNames = this._parsePropfindXml(xml);
    const records = [];
    for (const name of fileNames) {
      if (!name.endsWith('.json')) continue;
      try {
        const content = await this._request('GET', `/highlight-moments/records/${name}`);
        records.push(JSON.parse(content));
      } catch (e) {
        console.warn('读取记录失败:', name, e.message);
      }
    }
    return records;
  }

  /* 获取单条记录 */
  async getRecord(id) {
    const content = await this._request('GET', `/highlight-moments/records/${id}.json`);
    return JSON.parse(content);
  }

  /* 删除记录 */
  async deleteRecord(id) {
    await this._request('DELETE', `/highlight-moments/records/${id}.json`);
  }

  /* 保存媒体文件 */
  async saveMedia(id, blob, type) {
    await this.ensureBaseDir();
    const ext = type === 'image' ? 'jpg' : 'mp4';
    const path = `/highlight-moments/media/${id}.${ext}`;
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', this._buildUrl(path), true);
      xhr.setRequestHeader('Authorization', this.authHeader);
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`媒体保存失败: ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error('网络错误'));
      xhr.send(blob);
    });
  }

  /* 获取媒体文件 */
  async getMedia(id) {
    try {
      return await this._request('GET', `/highlight-moments/media/${id}.jpg`);
    } catch (e) {
      return await this._request('GET', `/highlight-moments/media/${id}.mp4`);
    }
  }

  /* 删除媒体文件 */
  async deleteMedia(id) {
    try { await this._request('DELETE', `/highlight-moments/media/${id}.jpg`); } catch (e) {}
    try { await this._request('DELETE', `/highlight-moments/media/${id}.mp4`); } catch (e) {}
  }

  /* 解析 PROPFIND XML 响应 */
  _parsePropfindXml(xml) {
    const names = [];
    const hrefRegex = /<(?:\w+:)?href[^>]*>([^<]+)<\/(?:\w+:)?href>/gi;
    let match;
    while ((match = hrefRegex.exec(xml)) !== null) {
      const href = decodeURIComponent(match[1]);
      const parts = href.replace(/\/$/, '').split('/');
      const fileName = parts[parts.length - 1];
      if (fileName && fileName !== 'records' && fileName !== '') {
        names.push(fileName);
      }
    }
    return names;
  }

  async getStorageUsage() {
    return { used: 0, total: 1024 * 1024 * 100 };
  }
}
