/* ============================================
   编辑器页面
   创建新记录 / 编辑已有记录
   ============================================ */

const Editor = {
  editingId: null,        // 正在编辑的记录 ID（null = 新建）
  attachments: [],        // 本次编辑的附件列表（本地暂存）
  isUploading: false,

  /* 渲染编辑器 */
  render(editId = null) {
    this.editingId = editId;
    this.attachments = [];
    this.isUploading = false;

    const container = document.getElementById('app-container');
    const currentUser = authService.getCurrentUser();

    // 未登录 → 跳转登录
    if (!currentUser) {
      Utils.toast('请先登录');
      Router.navigate('/login');
      return;
    }

    const isEdit = !!editId;
    let record = null;

    // 添加分享样式
    this._addShareStyles();

    if (isEdit) {
      record = Store.getRecord(editId);
      if (!record) {
        Utils.toast('记录不存在');
        Router.navigate('/');
        return;
      }
      this.attachments = [...(record.attachments || [])];
    }

    const config = Store.getConfig();

    container.innerHTML = `
      <div class="editor-page">
        <div class="editor-header">
          <button class="editor-close" id="editor-close">&times;</button>
          <span style="font-size:15px; font-weight:500;">${isEdit ? '编辑' : '新记录'} - ${currentUser?.name || '匿名用户'}</span>
          <button class="editor-save" id="editor-save">保存</button>
        </div>

        <div class="author-selector" id="author-selector" style="pointer-events:none;">
            <span class="author-dot" style="background:${currentUser?.color || '#86868B'}"></span>
            ${currentUser?.name || '匿名用户'}
        </div>

        <textarea class="editor-textarea" id="editor-text" placeholder="记录这一刻..." maxlength="2000">${isEdit ? record.content : ''}</textarea>
        <div class="char-count"><span id="char-count">${(isEdit ? record.content : '').length}</span>/2000</div>

        <div class="mood-selector" id="mood-selector">
          <button class="mood-btn" data-mood="">无</button>
          ${Record.moods.map(m => `
            <button class="mood-btn ${isEdit && record.mood === m.key ? 'active' : ''}" data-mood="${m.key}">${m.emoji} ${m.label}</button>
          `).join('')}
        </div>

        <div class="tag-input-area" id="tag-area">
          ${isEdit ? record.tags.map(t => `<span class="tag-pill">#${t}<button data-tag="${t}">&times;</button></span>`).join('') : ''}
          <input type="text" class="tag-input" id="tag-input" placeholder="添加标签（回车确认）">
        </div>

        <div class="attachment-actions">
          <label class="attach-btn" for="attach-photo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
            </svg>
            照片
          </label>
          <input type="file" id="attach-photo" accept="image/*" multiple hidden>
        </div>

        <div class="attachment-preview" id="attachment-preview"></div>
      </div>
    `;

    // 编辑模式：恢复心情
    if (isEdit && record) {
      if (record.mood) {
        container.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
        container.querySelector(`.mood-btn[data-mood="${record.mood}"]`)?.classList.add('active');
      }
    }

    this._bindEvents(container, isEdit);
    this._renderPreviews();
    this._loadExistingThumbnails();

    // 恢复草稿（仅新建模式）
    if (!isEdit) {
      this._restoreDraft();
    }
  },

  /* 添加分享相关的CSS样式 */
  _addShareStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .editor-page {
        border-left: 4px solid var(--accent-color);
      }

      .editor-page:not(.current-user) {
        border-left-color: var(--text-secondary);
        opacity: 0.9;
      }
    `;
    document.head.appendChild(style);
  },

  /* 绑定所有事件 */
  _bindEvents(container, isEdit) {
    // 关闭
    container.querySelector('#editor-close').addEventListener('click', () => {
      if (!isEdit) this._saveDraft();
      Router.navigate('/');
    });

    // 保存
    container.querySelector('#editor-save').addEventListener('click', () => this._save());

    // 作者信息自动取当前登录用户，无需手动切换

    // 心情切换
    container.querySelector('#mood-selector').addEventListener('click', e => {
      const btn = e.target.closest('.mood-btn');
      if (!btn) return;
      container.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });

    // 标签输入
    container.querySelector('#tag-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = e.target.value.trim();
        if (val) {
          const tagArea = document.getElementById('tag-area');
          const pill = document.createElement('span');
          pill.className = 'tag-pill';
          pill.innerHTML = `#${val}<button data-tag="${val}">&times;</button>`;
          tagArea.insertBefore(pill, e.target);
          e.target.value = '';
        }
      }
    });

    // 删除标签
    container.querySelector('#tag-area').addEventListener('click', e => {
      if (e.target.closest('.tag-pill button')) {
        e.target.closest('.tag-pill').remove();
      }
    });

    // 字数统计
    container.querySelector('#editor-text').addEventListener('input', e => {
      document.getElementById('char-count').textContent = e.target.value.length;
    });

    // 添加照片
    container.querySelector('#attach-photo').addEventListener('change', e => {
      this._handleFiles(Array.from(e.target.files));
      e.target.value = '';
    });

    // 桌面端拖拽
    container.querySelector('.editor-page').addEventListener('dragover', e => {
      e.preventDefault();
      e.currentTarget.style.outline = '2px dashed var(--accent)';
    });
    container.querySelector('.editor-page').addEventListener('dragleave', e => {
      e.currentTarget.style.outline = '';
    });
    container.querySelector('.editor-page').addEventListener('drop', e => {
      e.preventDefault();
      e.currentTarget.style.outline = '';
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
      this._handleFiles(files);
    });
  },

  /* 选中作者 */
  _selectAuthor(btn) {
    document.querySelectorAll('.author-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  },

  /* 处理选择的文件 */
  async _handleFiles(files) {
    if (this.isUploading) {
      Utils.toast('正在处理中，请稍等...');
      return;
    }
    this.isUploading = true;

    const saveBtn = document.getElementById('editor-save');
    if (saveBtn) saveBtn.disabled = true;

    try {
      for (const file of files) {
        const att = await Media.saveAttachment(file);
        this.attachments.push(att);
      }
      this._renderPreviews();
      this._loadThumbnailsForNew();
      Utils.toast(`已添加 ${files.length} 个文件`);
    } catch (err) {
      console.error('文件处理失败:', err);
      Utils.toast('文件处理失败，请重试');
    }

    this.isUploading = false;
    if (saveBtn) saveBtn.disabled = false;
  },

  /* 渲染附件预览 */
  _renderPreviews() {
    const previewEl = document.getElementById('attachment-preview');
    if (!previewEl) return;

    if (this.attachments.length === 0) {
      previewEl.innerHTML = '';
      return;
    }

    previewEl.innerHTML = this.attachments.map((att, i) => `
      <div class="preview-item" data-index="${i}">
        <img src="" alt="${att.fileName}" data-att-index="${i}">
        ${att.type === 'video' ? '<div class="preview-video-badge"></div>' : ''}
        <button class="preview-remove" data-index="${i}">&times;</button>
      </div>
    `).join('');

    // 删除附件
    previewEl.querySelectorAll('.preview-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index);
        this.attachments.splice(idx, 1);
        this._renderPreviews();
        this._loadThumbnailsForNew();
      });
    });
  },

  /* 为已存在的附件加载缩略图（编辑模式） */
  async _loadExistingThumbnails() {
    for (let i = 0; i < this.attachments.length; i++) {
      const att = this.attachments[i];
      const img = document.querySelector(`img[data-att-index="${i}"]`);
      if (!img || !att.thumbnailMediaId) continue;

      const blob = await Store.getBlob(att.thumbnailMediaId);
      if (blob) img.src = URL.createObjectURL(blob);
    }
  },

  /* 为新上传的附件加载缩略图 */
  async _loadThumbnailsForNew() {
    for (let i = 0; i < this.attachments.length; i++) {
      const att = this.attachments[i];
      const img = document.querySelector(`img[data-att-index="${i}"]`);
      if (!img || img.src) continue; // 已加载跳过

      const blob = att.thumbnailMediaId ? await Store.getBlob(att.thumbnailMediaId) : null;
      if (blob) img.src = URL.createObjectURL(blob);
    }
  },

  /* 保存记录 */
  _save() {
    const content = document.getElementById('editor-text').value.trim();
    if (!content && this.attachments.length === 0) {
      Utils.toast('写点什么或添加照片吧');
      return;
    }

    const currentUser = authService.getCurrentUser();
    const moodBtn = document.querySelector('.mood-btn.active');
    const tagPills = document.querySelectorAll('.tag-pill');
    const tags = Array.from(tagPills).map(p => p.dataset.tag).filter(Boolean);

    const data = {
      author: currentUser?.name || '我',
      authorId: currentUser?.id || 'default',
      authorColor: currentUser?.color || '#86868B',
      content,
      mood: moodBtn?.dataset.mood || '',
      tags,
      attachments: this.attachments
    };

    if (this.editingId) {
      // 更新
      const existing = Store.getRecord(this.editingId);
      const updated = Record.update(existing, data);
      Store.saveRecord(updated);
      Utils.toast('已更新');
    } else {
      // 新建
      const record = Record.create(data);
      Store.saveRecord(record);
      // 清除草稿
      sessionStorage.removeItem('hl_draft');
      Utils.toast('已保存');
    }

    Router.navigate('/');
  },

  /* 保存草稿到 sessionStorage */
  _saveDraft() {
    const content = document.getElementById('editor-text')?.value;
    if (!content) return;

    sessionStorage.setItem('hl_draft', JSON.stringify({
      content,
      savedAt: new Date().toISOString()
    }));
  },

  /* 恢复草稿 */
  _restoreDraft() {
    try {
      const draft = JSON.parse(sessionStorage.getItem('hl_draft'));
      if (!draft) return;
      const saved = new Date(draft.savedAt);
      const age = Date.now() - saved.getTime();
      // 草稿超过 1 小时就不恢复了
      if (age > 3600000) {
        sessionStorage.removeItem('hl_draft');
        return;
      }
      const textarea = document.getElementById('editor-text');
      if (textarea && draft.content) {
        textarea.value = draft.content;
        document.getElementById('char-count').textContent = draft.content.length;
      }
    } catch { /* ignore */ }
  }
};
