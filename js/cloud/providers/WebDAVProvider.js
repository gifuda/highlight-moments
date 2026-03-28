/* ============================================
   WebDAV 云盘提供商实现
   最通用的云盘标准，支持自建服务器和商业服务
   ============================================ */

class WebDAVProvider extends CloudProvider {
  constructor(config) {
    super(config);
    this.baseUrl = config.url;
    this.username = config.username;
    this.password = config.password;
  }

  /* 创建 XMLHttpRequest 并设置基本认证 */
  _createRequest(method, url, body = null) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url, true);
      xhr.setRequestHeader('Authorization', 'Basic ' + btoa(this.username + ':' + this.password));
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response);
        } else {
          reject(new Error(`WebDAV 请求失败: ${xhr.status} ${xhr.statusText}`));
        }
      };
      xhr.onerror = () => reject(new Error('网络错误'));
      xhr.send(body);
    });
  }

  /* 测试连接 */
  async testConnection() {
    try {
      await this._createRequest('PROPFIND', this.baseUrl);
      return true;
    } catch (err) {
      throw new Error('WebDAV 连接失败: ' + err.message);
    }
  }

  /* 保存记录 */
  async saveRecord(record) {
    const url = `${this.baseUrl}/records/${record.id}.json`;
    await this._createRequest('PUT', url, JSON.stringify(record));
  }

  /* 保存媒体文件 */
  async saveMedia(id, blob, type) {
    const url = `${this.baseUrl}/media/${id}.${type === 'image' ? 'jpg' : 'mp4'}`;
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url, true);
      xhr.setRequestHeader('Authorization', 'Basic ' + btoa(this.username + ':' + this.password));
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`媒体保存失败: ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('网络错误'));
      xhr.send(blob);
    });
  }

  /* 获取记录 */
  async getRecord(id) {
    const url = `${this.baseUrl}/records/${id}.json`;
    const response = await this._createRequest('GET', url);
    return JSON.parse(response);
  }

  /* 获取媒体文件 */
  async getMedia(id) {
    const url = `${this.baseUrl}/media/${id}.jpg`; // 默认先尝试图片
    try {
      const response = await this._createRequest('GET', url);
      return new Blob([response], { type: 'image/jpeg' });
    } catch (err) {
      // 尝试视频
      const videoUrl = `${this.baseUrl}/media/${id}.mp4`;
      const response = await this._createRequest('GET', videoUrl);
      return new Blob([response], { type: 'video/mp4' });
    }
  }

  /* 删除记录 */
  async deleteRecord(id) {
    const url = `${this.baseUrl}/records/${id}.json`;
    await this._createRequest('DELETE', url);
  }

  /* 删除媒体文件 */
  async deleteMedia(id) {
    const url = `${this.baseUrl}/media/${id}.jpg`;
    await this._createRequest('DELETE', url);
  }

  /* 获取所有记录 */
  async getAllRecords() {
    const url = `${this.baseUrl}/records/`;
    const response = await this._createRequest('PROPFIND', url);
    // 解析 PROPFIND 响应，获取所有记录文件
    const records = [];
    // 这里需要解析 WebDAV 的 XML 响应，简化版先返回空数组
    return records;
  }

  /* 获取存储用量 */
  async getStorageUsage() {
    // 简化版，返回模拟数据
    return { used: 1024 * 1024, total: 1024 * 1024 * 100 }; // 1MB / 100MB
  }
}