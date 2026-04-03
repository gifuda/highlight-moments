/* ============================================
   GitHub 云盘提供商
   通过 GitHub API 存储记录，国内可直接访问，无需代理
   数据存储在 GitHub 仓库的 data/records.json
   ============================================ */

class GitHubProvider extends CloudProvider {
  constructor(config) {
    super(config);
    this.token = config.token;
    this.repo = config.repo;   // "owner/repo"
    this.branch = config.branch || 'main';
    this.dataPath = 'data/records.json';
  }

  /* GitHub API 请求封装 */
  async _api(method, path, body = null) {
    const ref = method === 'GET' ? `?ref=${this.branch}` : '';
    const url = `https://api.github.com/repos/${this.repo}/contents/${path}${ref}`;
    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
    };
    if (body !== null) {
      headers['Content-Type'] = 'application/json';
    }
    const resp = await fetch(url, {
      method,
      headers,
      body: body !== null ? JSON.stringify(body) : undefined,
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.message || `GitHub API ${method} ${resp.status}`);
    return data;
  }

  /* 测试连接：验证仓库访问权限，并初始化数据文件 */
  async testConnection() {
    const resp = await fetch(`https://api.github.com/repos/${this.repo}`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    if (!resp.ok) throw new Error('仓库访问失败，请检查 Token 权限和仓库名');
    await this._ensureDataFile();
    return true;
  }

  /* 确保 data/records.json 文件存在 */
  async _ensureDataFile() {
    try {
      await this._api('GET', this.dataPath);
    } catch {
      await this._api('PUT', this.dataPath, {
        message: 'init highlight data',
        content: btoa('[]'),
      });
    }
  }

  /* 获取所有记录 */
  async getAllRecords() {
    try {
      const resp = await this._api('GET', this.dataPath);
      return JSON.parse(decodeURIComponent(escape(atob(resp.content))));
    } catch {
      return [];
    }
  }

  /* 批量保存所有记录（带冲突重试） */
  async _saveAll(records, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      let sha = null;
      try {
        const resp = await this._api('GET', this.dataPath);
        sha = resp.sha;
      } catch { /* 文件不存在，sha 保持 null */ }

      try {
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(records))));
        await this._api('PUT', this.dataPath, {
          message: 'sync records',
          content,
          sha,
        });
        return;
      } catch (err) {
        if (i < maxRetries - 1 && (err.message.includes('409') || err.message.includes('SHA'))) {
          // 冲突：重新读取云端数据并合并
          try {
            const cloudRecords = await this.getAllRecords();
            const cloudMap = new Map(cloudRecords.map(r => [r.id, r]));
            for (const rec of records) {
              const existing = cloudMap.get(rec.id);
              if (!existing || (rec.updatedAt && existing.updatedAt && rec.updatedAt > existing.updatedAt)) {
                cloudMap.set(rec.id, rec);
              }
            }
            records = Array.from(cloudMap.values());
          } catch { /* 读取失败，直接用本地数据重试 */ }
          continue;
        }
        throw err;
      }
    }
  }

  /* 保存单条记录 */
  async saveRecord(record) {
    const records = await this.getAllRecords();
    const idx = records.findIndex(r => r.id === record.id);
    if (idx >= 0) records[idx] = record;
    else records.push(record);
    await this._saveAll(records);
  }

  /* 获取单条记录 */
  async getRecord(id) {
    const records = await this.getAllRecords();
    return records.find(r => r.id === id) || null;
  }

  /* 删除记录 */
  async deleteRecord(id) {
    const records = (await this.getAllRecords()).filter(r => r.id !== id);
    await this._saveAll(records);
  }

  /* 媒体文件暂不支持（文字记录优先） */
  async saveMedia() { /* TODO */ }
  async getMedia() { return null; }
  async deleteMedia() {}

  async getStorageUsage() {
    return { used: 0, total: 1024 * 1024 * 100 };
  }
}
