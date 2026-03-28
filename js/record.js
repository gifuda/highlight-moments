/* ============================================
   记录业务逻辑
   创建、更新、校验、筛选
   ============================================ */

const Record = {
  /* 心情定义 */
  moods: [
    { key: 'happy', label: '开心', emoji: '😊', color: '#FFF8E1' },
    { key: 'love', label: '甜蜜', emoji: '❤️', color: '#FFF0F5' },
    { key: 'surprise', label: '惊喜', emoji: '✨', color: '#FFF3E0' },
    { key: 'peaceful', label: '宁静', emoji: '🌿', color: '#E8F5E9' },
    { key: 'funny', label: '搞笑', emoji: '😄', color: '#FFFDE7' },
    { key: 'touching', label: '感动', emoji: '🥹', color: '#F3E5F5' },
  ],

  getMood(key) {
    return this.moods.find(m => m.key === key) || null;
  },

  /* 创建新记录 */
  create({ author, authorId, content, mood = '', tags = [], attachments = [] }) {
    const now = new Date().toISOString();
    return {
      id: Utils.uuid(),
      createdAt: now,
      updatedAt: now,
      author: author || '我',
      authorId: authorId || 'default',
      content: content.trim(),
      mood,
      tags,
      attachments,  // [{id, type, fileName, size, mediaId, thumbnailMediaId, mimeType}]
      starred: false
    };
  },

  /* 更新记录（合并修改，刷新 updatedAt） */
  update(record, changes) {
    return {
      ...record,
      ...changes,
      updatedAt: new Date().toISOString()
    };
  },

  /* 筛选记录 */
  filter(records, { author, mood, search, starred } = {}) {
    let result = records;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.content.toLowerCase().includes(q) ||
        r.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    if (author) {
      result = result.filter(r => r.authorId === author);
    }

    if (mood && mood !== 'all') {
      result = result.filter(r => r.mood === mood);
    }

    if (starred) {
      result = result.filter(r => r.starred);
    }

    // 按创建时间倒序
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return result;
  }
};
