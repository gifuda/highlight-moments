/* ============================================
   云盘提供商标准接口
   所有云盘提供商都实现这个接口
   ============================================ */

class CloudProvider {
  constructor(config) {
    this.config = config;
  }

  /* 连接测试 */
  async testConnection() {
    throw new Error('子类必须实现 testConnection 方法');
  }

  /* 保存记录（JSON） */
  async saveRecord(record) {
    throw new Error('子类必须实现 saveRecord 方法');
  }

  /* 保存媒体文件（二进制） */
  async saveMedia(id, blob, type) {
    throw new Error('子类必须实现 saveMedia 方法');
  }

  /* 获取记录 */
  async getRecord(id) {
    throw new Error('子类必须实现 getRecord 方法');
  }

  /* 获取媒体文件 */
  async getMedia(id) {
    throw new Error('子类必须实现 getMedia 方法');
  }

  /* 删除记录 */
  async deleteRecord(id) {
    throw new Error('子类必须实现 deleteRecord 方法');
  }

  /* 删除媒体文件 */
  async deleteMedia(id) {
    throw new Error('子类必须实现 deleteMedia 方法');
  }

  /* 获取所有记录 */
  async getAllRecords() {
    throw new Error('子类必须实现 getAllRecords 方法');
  }

  /* 获取存储用量 */
  async getStorageUsage() {
    throw new Error('子类必须实现 getStorageUsage 方法');
  }
}