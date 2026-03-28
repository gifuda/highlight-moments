/* ============================================
   同步管理器
   管理本地与云盘之间的同步
   ============================================ */

class SyncManager {
  constructor() {
    this.provider = null;
    this.syncing = false;
    this.lastSync = null;
    this.spaces = [];
  }

  /* 初始化同步管理器 */
  async init() {
    const user = authService.getCurrentUser();
    if (!user?.cloudConfig?.provider) {
      return;
    }

    const providerClass = authService.cloudProviders[user.cloudConfig.provider];
    if (!providerClass) {
      throw new Error('不支持的云盘类型');
    }

    this.provider = new providerClass(user.cloudConfig);
    await this.provider.init();
    this.lastSync = await this.provider.getLastSyncTime();

    // 加载用户的空间
    this.spaces = invitationService.getUserSpaces(user.id);
  }

  /* 同步记录到云盘 */
  async syncRecords() {
    if (this.syncing) return;
    this.syncing = true;

    try {
      const records = Store.getRecords();
      for (const record of records) {
        await this.provider.saveRecord(record);
      }
      this.lastSync = new Date().toISOString();
      await this.provider.setLastSyncTime(this.lastSync);
      Utils.toast('记录已同步到云盘');
    } catch (err) {
      Utils.toast('同步失败: ' + err.message);
    } finally {
      this.syncing = false;
    }
  }

  /* 同步媒体文件到云盘 */
  async syncMedia() {
    if (this.syncing) return;
    this.syncing = true;

    try {
      // 获取所有记录的附件
      const records = Store.getRecords();
      for (const record of records) {
        if (record.attachments) {
          for (const att of record.attachments) {
            const blob = await Store.getBlob(att.mediaId);
            if (blob) {
              await this.provider.saveMedia(att.id, blob, att.type);
            }
          }
        }
      }
      Utils.toast('媒体文件已同步到云盘');
    } catch (err) {
      Utils.toast('媒体同步失败: ' + err.message);
    } finally {
      this.syncing = false;
    }
  }

  /* 同步空间数据 */
  async syncSpaces() {
    if (this.syncing) return;
    this.syncing = true;

    try {
      const spaces = invitationService.getUserSpaces(authService.getCurrentUser().id);
      for (const space of spaces) {
        await this.provider.saveSpace(space);
      }
      Utils.toast('空间数据已同步到云盘');
    } catch (err) {
      Utils.toast('空间同步失败: ' + err.message);
    } finally {
      this.syncing = false;
    }
  }

  /* 完整同步（记录 + 媒体 + 空间） */
  async fullSync() {
    await this.syncRecords();
    await this.syncMedia();
    await this.syncSpaces();
  }

  /* 检查是否需要同步 */
  needsSync() {
    if (!this.provider) return false;
    if (this.syncing) return false;

    const lastSync = this.lastSync;
    if (!lastSync) return true;

    const now = new Date();
    const lastSyncDate = new Date(lastSync);
    const hoursSinceLastSync = (now - lastSyncDate) / (1000 * 60 * 60);

    return hoursSinceLastSync > 1; // 每小时同步一次
  }

  /* 获取最后同步时间 */
  getLastSync() {
    return this.lastSync;
  }
}

// 全局单例
const syncManager = new SyncManager();