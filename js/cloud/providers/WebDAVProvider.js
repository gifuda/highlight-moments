/* ============================================
   WebDAV 云盘提供商实现
   通过本地中转代理访问坚果云，解决 CORS 限制
   ============================================ */

class WebDAVProvider extends CloudProvider {
  constructor(config) {
    super(config);
    this.proxyUrl = config.proxyUrl || 'http://localhost:3001/proxy';
    this.username = config.username;
    this.password = config.password;
    this.authHeader = 'Basic ' + btoa(this.username + ':' + this.password);
  }

  /* 发起请求（通过本地代理） */
  _request(method, path, body = null, extraHeaders = {}) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, this.proxyUrl + path, true);
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
      xhr.onerror = () => reject(new Error('网络错误，请确认中转服务已启动'));
      xhr.send(body);
    });
  }

  /* 确保 /highlight-moments/ 目录存在 */
  async ensureBaseDir() {
    try {
      await this._request('MKCOL', '/highlight-moments');
    } catch (e) {
      // 目录可能已存在，忽略错误
    }
    try {
      await this._request('MKCOL', '/highlight-moments/records');
    } catch (e) {}
    try {
      await this._request('MKCOL', '/highlight-moments/media');
    } catch (e) {}
  }

  /* 测试连接 */
  async testConnection() {
    try {
      await this._request('PROPFIND', '/', null, { 'Depth': '0' });
      await this.ensureBaseDir();
      return true;
    } catch (err) {
      throw new Error('坚果云连接失败: ' + err.message);
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

    // 解析 XML 获取文件列表
    const fileNames = this._parsePropfindXml(xml);

    // 逐个获取记录内容
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
      xhr.open('PUT', this.proxyUrl + path, true);
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
    // 先尝试图片
    try {
      const content = await this._request('GET', `/highlight-moments/media/${id}.jpg`);
      return content;
    } catch (e) {
      // 尝试视频
      const content = await this._request('GET', `/highlight-moments/media/${id}.mp4`);
      return content;
    }
  }

  /* 删除媒体文件 */
  async deleteMedia(id) {
    try { await this._request('DELETE', `/highlight-moments/media/${id}.jpg`); } catch (e) {}
    try { await this._request('DELETE', `/highlight-moments/media/${id}.mp4`); } catch (e) {}
  }

  /* 解析 PROPFIND XML 响应，提取文件名 */
  _parsePropfindXml(xml) {
    const names = [];
    // 匹配 <d:href>...</d:href> 或 <href>...</href>
    const hrefRegex = /<(?:\w+:)?href[^>]*>([^<]+)<\/(?:\w+:)?href>/gi;
    let match;
    while ((match = hrefRegex.exec(xml)) !== null) {
      const href = decodeURIComponent(match[1]);
      // 只取文件名部分，跳过目录本身
      const parts = href.replace(/\/$/, '').split('/');
      const fileName = parts[parts.length - 1];
      if (fileName && fileName !== 'records' && fileName !== '') {
        names.push(fileName);
      }
    }
    return names;
  }

  /* 获取存储用量 */
  async getStorageUsage() {
    return { used: 0, total: 1024 * 1024 * 100 };
  }
}
