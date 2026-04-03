/* ============================================
   同步管理器
   管理本地 localStorage 与坚果云 WebDAV 之间的同步
   ============================================ */

class SyncManager {
  constructor() {
    this.provider = null;
    this.syncing = false;
    this.lastSync = null;
    this._syncTimer = null;
  }

  /* 初始化：读取用户云盘配置，创建 Provider */
  async init() {
    const user = authService.getCurrentUser();
    const cfg = user?.cloudConfig;
    if (!cfg) return;

    try {
      if (cfg.provider === 'github' && cfg.token) {
        this.provider = new GitHubProvider(cfg);
      } else if (cfg.username) {
        this.provider = new WebDAVProvider(cfg);
      }
      this.lastSync = localStorage.getItem('hl_last_sync');
    } catch (err) {
      console.warn('SyncManager 初始化失败:', err.message);
    }
  }

  /* 启动定时同步（每 30 秒） */
  startAutoSync() {
    this.stopAutoSync();
    this._syncTimer = setInterval(() => {
      this.silentSync();
    }, 30000);
    // 首次立即同步一次
    this.silentSync();
  }

  /* 停止定时同步 */
  stopAutoSync() {
    if (this._syncTimer) {
      clearInterval(this._syncTimer);
      this._syncTimer = null;
    }
  }

  /* 静默同步：不弹 toast，仅在有新记录时通知 */
  async silentSync() {
    if (!this.provider || this.syncing) return;

    const localCount = Store.getRecords().length;
    this.syncing = true;

    try {
      // 拉取云端记录
      const cloudRecords = await this.provider.getAllRecords();
      const localRecords = Store.getRecords();

      const localMap = new Map(localRecords.map(r => [r.id, r]));
      const newRecords = [];

      for (const cloudRecord of cloudRecords) {
        if (!localMap.has(cloudRecord.id)) {
          newRecords.push(cloudRecord);
        }
        localMap.set(cloudRecord.id, cloudRecord);
      }

      if (newRecords.length > 0) {
        const merged = Array.from(localMap.values());
        localStorage.setItem(Store.LS_RECORDS, JSON.stringify(merged));

        // 通知时间轴刷新
        this._notifyNewRecords(newRecords);
      }

      // 推送本地独有的记录到云端
      const cloudMap = new Map(cloudRecords.map(r => [r.id, r]));
      for (const localRecord of localRecords) {
        if (!cloudMap.has(localRecord.id)) {
          await this.provider.saveRecord(localRecord);
        } else {
          // 已存在：比较 updatedAt，取更新的版本
          const cloudRec = cloudMap.get(localRecord.id);
          if (localRecord.updatedAt && cloudRec.updatedAt &&
              new Date(localRecord.updatedAt) > new Date(cloudRec.updatedAt)) {
            await this.provider.saveRecord(localRecord);
          }
        }
      }

      this.lastSync = new Date().toISOString();
      localStorage.setItem('hl_last_sync', this.lastSync);
    } catch (err) {
      console.warn('静默同步失败:', err.message);
    } finally {
      this.syncing = false;
    }
  }

  /* 通知有新记录 */
  _notifyNewRecords(newRecords) {
    // 找出其他用户的记录
    const currentUser = authService.getCurrentUser();
    const otherNewRecords = newRecords.filter(r => r.authorId !== currentUser?.id);

    if (otherNewRecords.length > 0) {
      const names = [...new Set(otherNewRecords.map(r => r.author))];
      const msg = names.length === 1
        ? `${names[0]} 发布了 ${otherNewRecords.length} 条新消息`
        : `${names.join('、')} 发布了 ${otherNewRecords.length} 条新消息`;
      Utils.toast(msg);
    }

    // 刷新时间轴（如果当前在首页）
    if (typeof Timeline !== 'undefined' && document.getElementById('timeline-page')) {
      Timeline._renderList();
    }
  }

  /* 上传本地记录到坚果云 */
  async pushRecords() {
    if (!this.provider || this.syncing) return;
    this.syncing = true;

    try {
      await this.provider.ensureBaseDir();
      const records = Store.getRecords();
      for (const record of records) {
        await this.provider.saveRecord(record);
      }
      this.lastSync = new Date().toISOString();
      localStorage.setItem('hl_last_sync', this.lastSync);
      Utils.toast(`${records.length} 条记录已同步到云盘`);
    } catch (err) {
      Utils.toast('上传失败: ' + err.message);
    } finally {
      this.syncing = false;
    }
  }

  /* 从坚果云拉取记录到本地 */
  async pullRecords() {
    if (!this.provider || this.syncing) return;
    this.syncing = true;

    try {
      const cloudRecords = await this.provider.getAllRecords();
      const localRecords = Store.getRecords();

      const localMap = new Map(localRecords.map(r => [r.id, r]));
      for (const cloudRecord of cloudRecords) {
        localMap.set(cloudRecord.id, cloudRecord);
      }

      const merged = Array.from(localMap.values());
      localStorage.setItem(Store.LS_RECORDS, JSON.stringify(merged));

      this.lastSync = new Date().toISOString();
      localStorage.setItem('hl_last_sync', this.lastSync);
      Utils.toast(`已从云盘拉取 ${cloudRecords.length} 条记录`);
    } catch (err) {
      Utils.toast('拉取失败: ' + err.message);
    } finally {
      this.syncing = false;
    }
  }

  /* 完整双向同步（手动触发） */
  async fullSync() {
    if (!this.provider) {
      Utils.toast('请先配置同步服务');
      return;
    }
    await this.pullRecords();
    await this.pushRecords();

    if (typeof Timeline !== 'undefined') {
      Timeline.render();
    }
  }

  /* 保存单条记录后立即推送 */
  async pushRecord(record) {
    if (!this.provider) return;
    try {
      await this.provider.ensureBaseDir();
      await this.provider.saveRecord(record);
      this.lastSync = new Date().toISOString();
      localStorage.setItem('hl_last_sync', this.lastSync);
    } catch (err) {
      console.warn('推送单条记录失败:', err.message);
    }
  }

  needsSync() {
    if (!this.provider) return false;
    if (this.syncing) return false;
    if (!this.lastSync) return true;
    const hoursSince = (Date.now() - new Date(this.lastSync).getTime()) / (1000 * 60 * 60);
    return hoursSince > 1;
  }

  getLastSync() {
    return this.lastSync;
  }

  isConfigured() {
    return !!this.provider;
  }

  isGitHub() {
    return this.provider instanceof GitHubProvider;
  }
}

// 全局单例
const syncManager = new SyncManager();
