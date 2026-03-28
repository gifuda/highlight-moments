/* ============================================
   数据存储层
   统一管理 localStorage（记录元数据）和 IndexedDB（图片/视频文件）
   扩展：支持云盘存储
   ============================================ */

const Store = {
  DB_NAME: 'highlight_media',
  DB_VERSION: 1,
  db: null,              // IndexedDB 实例
  LS_RECORDS: 'hl_records',    // localStorage 键名：记录列表
  LS_CONFIG: 'hl_config',      // localStorage 键名：应用配置
  LS_USERS: 'hl_users',        // localStorage 键名：用户列表
  LS_SPACES: 'hl_spaces',      // localStorage 键名：空间列表
  LS_SPACES: 'hl_spaces',      // localStorage 键名：空间列表
  LS_INVITATIONS: 'hl_invitations', // localStorage 键名：邀请码列表

  /* ---- 初始化 ---- */
  async init() {
    // 打开 IndexedDB
    this.db = await this._openDB();
    console.log('Store 已初始化');
  },

  _openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        // 创建 "blobs" 对象仓库，用来存图片和视频的二进制数据
        if (!db.objectStoreNames.contains('blobs')) {
          const store = db.createObjectStore('blobs', { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  /* ---- 配置管理 ---- */
  getConfig() {
    try {
      return JSON.parse(localStorage.getItem(this.LS_CONFIG));
    } catch { return null; }
  },

  saveConfig(config) {
    localStorage.setItem(this.LS_CONFIG, JSON.stringify(config));
  },

  /* ---- 用户管理 ---- */
  getUsers() {
    try {
      return JSON.parse(localStorage.getItem(this.LS_USERS)) || [];
    } catch { return []; }
  },

  saveUsers(users) {
    localStorage.setItem(this.LS_USERS, JSON.stringify(users));
  },

  getUser(id) {
    return this.getUsers().find(u => u.id === id) || null;
  },

  /* ---- 空间管理 ---- */
  getSpaces() {
    try {
      return JSON.parse(localStorage.getItem(this.LS_SPACES)) || [];
    } catch { return []; }
  },

  saveSpaces(spaces) {
    localStorage.setItem(this.LS_SPACES, JSON.stringify(spaces));
  },

  getSpace(id) {
    return this.getSpaces().find(s => s.id === id) || null;
  },

  /* ---- 邀请管理 ---- */
  getInvitations() {
    try {
      return JSON.parse(localStorage.getItem(this.LS_INVITATIONS)) || [];
    } catch { return []; }
  },

  saveInvitations(invitations) {
    localStorage.setItem(this.LS_INVITATIONS, JSON.stringify(invitations));
  },

  getInvitation(code) {
    return this.getInvitations().find(i => i.code === code) || null;
  },

  /* ---- 空间管理 ---- */
  getSpaces() {
    try {
      return JSON.parse(localStorage.getItem(this.LS_SPACES)) || [];
    } catch { return []; }
  },

  saveSpaces(spaces) {
    localStorage.setItem(this.LS_SPACES, JSON.stringify(spaces));
  },

  getSpace(id) {
    return this.getSpaces().find(s => s.id === id) || null;
  },

  /* ---- 邀请码管理 ---- */
  getInvitations() {
    try {
      return JSON.parse(localStorage.getItem(this.LS_INVITATIONS)) || [];
    } catch { return []; }
  },

  saveInvitations(invitations) {
    localStorage.setItem(this.LS_INVITATIONS, JSON.stringify(invitations));
  },

  /* ---- 记录 CRUD ---- */
  getRecords() {
    try {
      const arr = JSON.parse(localStorage.getItem(this.LS_RECORDS));
      return arr || [];
    } catch { return []; }
  },

  getRecord(id) {
    return this.getRecords().find(r => r.id === id) || null;
  },

  saveRecord(record) {
    const records = this.getRecords();
    const idx = records.findIndex(r => r.id === record.id);
    if (idx >= 0) {
      records[idx] = record;
    } else {
      records.push(record);
    }
    localStorage.setItem(this.LS_RECORDS, JSON.stringify(records));
  },

  deleteRecord(id) {
    // 1. 获取记录，找到关联的附件
    const record = this.getRecord(id);
    if (record && record.attachments) {
      // 2. 删除所有关联的图片/视频
      for (const att of record.attachments) {
        this.deleteBlob(att.mediaId);
        if (att.thumbnailMediaId) this.deleteBlob(att.thumbnailMediaId);
      }
    }
    // 3. 从列表中移除
    const records = this.getRecords().filter(r => r.id !== id);
    localStorage.setItem(this.LS_RECORDS, JSON.stringify(records));
  },

  /* ---- IndexedDB: 存储/读取 二进制文件 ---- */
  saveBlob(id, blob, type = 'image') {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('blobs', 'readwrite');
      tx.objectStore('blobs').put({
        id,
        blob,
        type,
        createdAt: new Date().toISOString()
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  getBlob(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('blobs', 'readonly');
      const req = tx.objectStore('blobs').get(id);
      req.onsuccess = () => resolve(req.result ? req.result.blob : null);
      req.onerror = () => reject(req.error);
    });
  },

  deleteBlob(id) {
    return new Promise((resolve) => {
      const tx = this.db.transaction('blobs', 'readwrite');
      tx.objectStore('blobs').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve(); // 静默处理
    });
  },

  /* 估算存储用量 */
  async getStorageUsage() {
    // localStorage
    let lsBytes = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        lsBytes += (localStorage[key].length + key.length) * 2; // UTF-16
      }
    }

    // IndexedDB（遍历所有 blob）
    let idbBytes = 0;
    const tx = this.db.transaction('blobs', 'readonly');
    const store = tx.objectStore('blobs');
    const req = store.openCursor();

    await new Promise(resolve => {
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          idbBytes += cursor.value.blob.size;
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => resolve();
    });

    return { localStorage: lsBytes, indexedDB: idbBytes };
  },

  /* 清空所有数据 */
  async clearAll() {
    localStorage.removeItem(this.LS_RECORDS);
    localStorage.removeItem(this.LS_CONFIG);
    localStorage.removeItem(this.LS_USERS);
    localStorage.removeItem(this.LS_SPACES);
    localStorage.removeItem(this.LS_INVITATIONS);

    const tx = this.db.transaction('blobs', 'readwrite');
    tx.objectStore('blobs').clear();
    await new Promise(resolve => { tx.oncomplete = resolve; });
  }
};