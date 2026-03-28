/* ============================================
   同步管理器
   管理本地 localStorage 与坚果云 WebDAV 之间的同步
   ============================================ */

class SyncManager {
  constructor() {
    this.provider = null;
    this.syncing = false;
    this.lastSync = null;
  }

  /* 初始化：读取用户云盘配置，创建 Provider */
  async init() {
    const user = authService.getCurrentUser();
    if (!user?.cloudConfig?.username) return;

    try {
      this.provider = new WebDAVProvider(user.cloudConfig);
      this.lastSync = localStorage.getItem('hl_last_sync');
    } catch (err) {
      console.warn('SyncManager 初始化失败:', err.message);
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
      Utils.toast(`${records.length} 条记录已同步到坚果云`);
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

      // 合并策略：以 id 为准，云端有的覆盖本地，本地独有的保留
      const localMap = new Map(localRecords.map(r => [r.id, r]));
      for (const cloudRecord of cloudRecords) {
        localMap.set(cloudRecord.id, cloudRecord);
      }

      const merged = Array.from(localMap.values());
      localStorage.setItem(Store.LS_RECORDS, JSON.stringify(merged));

      this.lastSync = new Date().toISOString();
      localStorage.setItem('hl_last_sync', this.lastSync);
      Utils.toast(`已从坚果云拉取 ${cloudRecords.length} 条记录`);
    } catch (err) {
      Utils.toast('拉取失败: ' + err.message);
    } finally {
      this.syncing = false;
    }
  }

  /* 完整双向同步 */
  async fullSync() {
    if (!this.provider) {
      Utils.toast('请先配置坚果云');
      return;
    }

    // 先拉取云端数据
    await this.pullRecords();
    // 再推送本地数据
    await this.pushRecords();

    // 刷新时间轴
    if (typeof Timeline !== 'undefined') {
      Timeline.render();
    }
  }

  /* 检查是否需要同步 */
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
}

// 全局单例
const syncManager = new SyncManager();
