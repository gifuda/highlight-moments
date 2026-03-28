/* ============================================
   时间轴页面
   渲染记录列表、日期分组、搜索筛选
   ============================================ */

const Timeline = {
  filterState: { search: '', mood: 'all', starred: false },
  observer: null,  // IntersectionObserver，用于懒加载图片

  /* 渲染时间轴页面 */
  render() {
    const container = document.getElementById('app-container');
    const config = Store.getConfig();

    if (!config) {
      // 还没设置，显示引导
      this._renderOnboarding(container);
      return;
    }

    // 添加分享样式
    this._addShareStyles();

    // 更新标题
    document.getElementById('header-title').textContent = config.spaceName || '高光时刻';

    container.innerHTML = `
      <div class="page" id="timeline-page">
        <div class="search-bar">
          <svg class="search-bar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" id="search-input" placeholder="搜索记录...">
        </div>
        <div class="filter-bar" id="filter-bar">
          <button class="filter-chip active" data-mood="all">全部</button>
          ${Record.moods.map(m => `
            <button class="filter-chip" data-mood="${m.key}">${m.emoji} ${m.label}</button>
          `).join('')}
          <button class="filter-chip" data-mood="starred">⭐ 收藏</button>
        </div>
        <div id="timeline-list"></div>
      </div>
    `;

    // 绑定搜索
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', Utils.debounce(e => {
      this.filterState.search = e.target.value;
      this._renderList();
    }));

    // 绑定筛选
    document.getElementById('filter-bar').addEventListener('click', e => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      const mood = chip.dataset.mood;

      // 切换高亮
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      this.filterState.mood = mood;
      this.filterState.starred = (mood === 'starred');
      this._renderList();
    });

    this._renderList();
  },

  /* 渲染记录列表 */
  _renderList() {
    const records = Store.getRecords();
    const filtered = Record.filter(records, this.filterState);
    const listEl = document.getElementById('timeline-list');

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="timeline-empty">
          <div class="timeline-empty-icon">${this.filterState.search ? '🔍' : '✨'}</div>
          <h2>${this.filterState.search ? '没有找到记录' : '还没有高光时刻'}</h2>
          <p>${this.filterState.search ? '试试其他关键词' : '点击下方 + 按钮，记录第一个美好瞬间'}</p>
        </div>
      `;
      return;
    }

    // 按日期分组
    const groups = {};
    for (const record of filtered) {
      const dateKey = new Date(record.createdAt).toDateString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(record);
    }

    let html = '';
    for (const [dateKey, items] of Object.entries(groups)) {
      html += `<div class="date-group-header">${Utils.formatDate(items[0].createdAt)}</div>`;
      for (const record of items) {
        html += this._renderCard(record);
      }
    }
    listEl.innerHTML = html;

    // 绑定卡片事件
    listEl.querySelectorAll('.record-card').forEach(card => {
      const recordId = card.dataset.id;

      // 收藏按钮
      card.querySelector('.card-star')?.addEventListener('click', e => {
        e.stopPropagation();
        this._toggleStar(recordId);
      });

      // 更多操作
      card.querySelector('.card-actions')?.addEventListener('click', e => {
        e.stopPropagation();
        this._showActions(recordId, card);
      });

      // 点击图片查看大图
      card.querySelectorAll('.card-photo').forEach(img => {
        img.addEventListener('click', () => {
          const mediaId = img.dataset.mediaId;
          this._viewPhoto(mediaId);
        });
      });

      // 点击卡片进入编辑
      card.addEventListener('click', (e) => {
        if (e.target.closest('.card-star') || e.target.closest('.card-actions') || e.target.closest('.card-photo')) return;
        Router.navigate('/edit/' + recordId);
      });
    });

    // 懒加载图片
    this._lazyLoadImages(listEl);
  },

  /* 添加分享相关的CSS样式 */
  _addShareStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .record-card {
        border-left: 4px solid var(--accent-color);
      }

      .record-card:not(.current-user) {
        border-left-color: var(--text-secondary);
        opacity: 0.9;
      }

      .author-badge {
        background: var(--text-secondary);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
        margin-left: 8px;
      }
    `;
    document.head.appendChild(style);
  },

  /* 渲染单张卡片 */
  _renderCard(record) {
    const authorInfo = Store.getUsers().find(u => u.id === record.authorId) || {};
    const authorColor = record.authorColor || authorInfo.color || '#86868B';
    const mood = Record.getMood(record.mood);
    const isCurrentUser = authService.getCurrentUser()?.id === record.authorId;

    let photosHtml = '';
    if (record.attachments && record.attachments.length > 0) {
      const count = record.attachments.length;
      const cols = count === 1 ? 'cols-1' : count === 2 ? 'cols-2' : 'cols-3';
      photosHtml = `<div class="card-photos ${cols}">`;
      for (const att of record.attachments) {
        const isVideo = att.type === 'video';
        photosHtml += `<div class="${isVideo ? 'card-photo-video' : ''}">
          <img class="card-photo" data-media-id="${att.mediaId}" data-type="${att.type}" src="" alt="${att.fileName}" loading="lazy">
        </div>`;
      }
      photosHtml += '</div>';
    }

    let tagsHtml = '';
    if (record.tags && record.tags.length > 0) {
      tagsHtml = record.tags.map(t => `<span class="card-tag">#${t}</span>`).join('');
    }

    let moodHtml = '';
    if (mood) {
      moodHtml = `<span class="card-mood">${mood.emoji} ${mood.label}</span>`;
    }

    return `
      <div class="record-card" data-id="${record.id}">
        <div class="card-header">
          <div class="card-author">
            <div class="author-dot" style="background:${authorColor}"></div>
            <span class="author-name">${record.author}</span>
            ${!isCurrentUser ? '<span class="author-badge">他人</span>' : ''}
          </div>
          <span class="card-time">${Utils.formatTime(record.createdAt)}</span>
        </div>
        <div class="card-content">${this._escapeHtml(record.content)}</div>
        ${moodHtml}
        ${photosHtml}
        <div class="card-footer">
          ${tagsHtml}
          <button class="card-star ${record.starred ? 'starred' : ''}" title="收藏">
            ${record.starred ? '★' : '☆'}
          </button>
          <button class="card-actions" title="更多">···</button>
        </div>
      </div>
    `;
  },

  /* 懒加载：当图片进入可视区域时才加载 */
  _lazyLoadImages(container) {
    if (this.observer) this.observer.disconnect();

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(async entry => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        if (img.dataset.loaded) return;

        img.dataset.loaded = 'true';
        const mediaId = img.dataset.mediaId;
        const records = Store.getRecords();
        const record = records.find(r => r.attachments?.some(a => a.mediaId === mediaId));
        const attachment = record?.attachments?.find(a => a.mediaId === mediaId);

        if (attachment) {
          const url = await Media.getMediaUrl(attachment);
          if (url) {
            img.src = url;
            // 播放视频
            if (attachment.type === 'video' && img.parentElement) {
              // 视频用 img 显示缩略图即可，点击看大图时再播放
            }
          }
        }
        this.observer.unobserve(img);
      });
    }, { rootMargin: '100px' });

    container.querySelectorAll('.card-photo[data-media-id]').forEach(img => {
      this.observer.observe(img);
    });
  },

  /* 收藏/取消收藏 */
  _toggleStar(id) {
    const record = Store.getRecord(id);
    if (!record) return;
    record.starred = !record.starred;
    record.updatedAt = new Date().toISOString();
    Store.saveRecord(record);
    this._renderList();
  },

  /* 更多操作（编辑/删除） */
  _showActions(id, cardEl) {
    // 创建操作菜单
    const rect = cardEl.getBoundingClientRect();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3>操作</h3>
        <div class="modal-actions" style="flex-direction: column; gap: 8px;">
          <button class="modal-cancel" id="action-edit" style="flex:unset; padding: 12px;">编辑</button>
          <button class="modal-confirm" id="action-delete" style="flex:unset; padding: 12px; background: var(--text-secondary);">删除</button>
        </div>
        <div style="margin-top: 8px;">
          <button class="modal-cancel" id="action-cancel" style="flex: unset; width: 100%; padding: 10px;">取消</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#action-edit').onclick = () => {
      overlay.remove();
      Router.navigate('/edit/' + id);
    };
    overlay.querySelector('#action-delete').onclick = async () => {
      overlay.remove();
      const ok = await Utils.confirm('删除记录', '确定要删除这条记录吗？删除后无法恢复。');
      if (ok) {
        Store.deleteRecord(id);
        this._renderList();
        Utils.toast('已删除');
      }
    };
    overlay.querySelector('#action-cancel').onclick = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  },

  /* 查看大图 */
  async _viewPhoto(mediaId) {
    const url = await Media.getFullMediaUrl(
      { mediaId, thumbnailMediaId: null } // 强制加载原图
    );
    // 实际上需要找到 attachment 来获取完整信息
    const records = Store.getRecords();
    const record = records.find(r => r.attachments?.some(a => a.mediaId === mediaId));
    const att = record?.attachments?.find(a => a.mediaId === mediaId);

    if (!att) return;

    let blobUrl;
    if (att.type === 'video') {
      // 视频就加载原始文件
      const blob = await Store.getBlob(att.mediaId);
      blobUrl = blob ? URL.createObjectURL(blob) : null;
    } else {
      blobUrl = await Media.getFullMediaUrl(att);
    }

    if (!blobUrl) return;

    const overlay = document.getElementById('viewer-overlay');
    const img = document.getElementById('viewer-img');

    if (att.type === 'video') {
      // 视频用 video 元素
      img.style.display = 'none';
      let videoEl = overlay.querySelector('video');
      if (!videoEl) {
        videoEl = document.createElement('video');
        videoEl.controls = true;
        videoEl.style.cssText = 'max-width:95vw; max-height:90vh; border-radius:4px;';
        overlay.insertBefore(videoEl, overlay.querySelector('.viewer-close'));
      }
      videoEl.style.display = '';
      videoEl.src = blobUrl;
    } else {
      // 图片
      const videoEl = overlay.querySelector('video');
      if (videoEl) videoEl.style.display = 'none';
      img.style.display = '';
      img.src = blobUrl;
    }

    overlay.classList.add('active');
  },

  /* HTML 转义（防 XSS） */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /* ---- 首次引导页 ---- */
  _renderOnboarding(container) {
    document.getElementById('header-title').textContent = '高光时刻';

    const defaultColors = ['#FF6B6B', '#4ECDC4', '#FFD93D', '#6C5CE7', '#FF8A5C', '#A8E6CF'];

    container.innerHTML = `
      <div class="page">
        <div class="onboarding">
          <h2>记录你的高光时刻</h2>
          <p>和重要的人一起，用文字和照片珍藏每一个美好瞬间。<br>数据完全属于你，永远可以带走。</p>
          <div class="onboarding-form">
            <div class="form-group">
              <label class="form-label">给这个空间取个名字</label>
              <input type="text" class="form-input" id="onb-space" placeholder="比如：我们的故事" value="我们的故事">
            </div>
            <div class="form-group">
              <label class="form-label">添加成员（至少 1 人）</label>
              <div class="author-list-input" id="onb-authors">
                <div class="author-input-row">
                  <div class="color-dot selected" style="background:${defaultColors[0]}" data-color="${defaultColors[0]}"></div>
                  <input type="text" class="form-input" id="onb-name-0" placeholder="你的名字" style="flex:1; text-align:left;">
                </div>
              </div>
              <button class="btn-secondary" id="onb-add-author" style="margin-top:10px;">+ 添加成员</button>
            </div>
            <button class="btn-primary" id="onb-start">开始记录</button>
          </div>
        </div>
      </div>
    `;

    let authorCount = 1;
    let selectedColors = [defaultColors[0]];

    // 颜色选择
    container.addEventListener('click', e => {
      const dot = e.target.closest('.color-dot');
      if (!dot) return;

      // 显示颜色选择弹窗
      const row = dot.closest('.author-input-row');
      const existingPicker = row.querySelector('.color-picker');
      if (existingPicker) { existingPicker.remove(); return; }

      const picker = document.createElement('div');
      picker.className = 'color-picker';
      picker.style.cssText = 'display:flex; gap:6px; margin-top:6px;';
      for (const color of defaultColors) {
        const c = document.createElement('div');
        c.className = 'color-dot' + (dot.dataset.color === color ? ' selected' : '');
        c.style.background = color;
        c.dataset.color = color;
        c.addEventListener('click', () => {
          dot.style.background = color;
          dot.dataset.color = color;
          dot.classList.add('selected');
          picker.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
          c.classList.add('selected');
          picker.remove();
        });
        picker.appendChild(c);
      }
      row.appendChild(picker);
    });

    // 添加成员
    container.querySelector('#onb-add-author').addEventListener('click', () => {
      const list = document.getElementById('onb-authors');
      const color = defaultColors[authorCount % defaultColors.length];
      const row = document.createElement('div');
      row.className = 'author-input-row';
      row.innerHTML = `
        <div class="color-dot selected" style="background:${color}" data-color="${color}"></div>
        <input type="text" class="form-input" id="onb-name-${authorCount}" placeholder="名字" style="flex:1; text-align:left;">
        <button class="icon-btn onb-remove-author" title="移除" style="color:#FF3B30;">×</button>
      `;
      list.appendChild(row);
      row.querySelector('.onb-remove-author').addEventListener('click', () => row.remove());
      authorCount++;
    });

    // 开始
    container.querySelector('#onb-start').addEventListener('click', () => {
      const spaceName = document.getElementById('onb-space').value.trim() || '我们的故事';
      const rows = container.querySelectorAll('.author-input-row');

      const authors = [];
      rows.forEach((row, i) => {
        const name = row.querySelector('input').value.trim();
        const color = row.querySelector('.color-dot').dataset.color;
        if (name) {
          authors.push({ id: 'user-' + i, name, color });
        }
      });

      if (authors.length === 0) {
        Utils.toast('请至少添加一个成员');
        return;
      }

      const config = {
        version: '1.0.0',
        spaceName,
        authors,
        currentAuthor: authors[0].id,
        createdAt: new Date().toISOString()
      };
      Store.saveConfig(config);
      document.getElementById('header-title').textContent = spaceName;
      Router.navigate('/');
      Utils.toast('设置完成，开始记录吧！');
    });
  }
};

/* 关闭图片查看器 */
document.getElementById('viewer-close').addEventListener('click', () => {
  document.getElementById('viewer-overlay').classList.remove('active');
  // 释放 URL
  const img = document.getElementById('viewer-img');
  if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
  const video = document.querySelector('.viewer-overlay video');
  if (video && video.src.startsWith('blob:')) URL.revokeObjectURL(video.src);
  img.src = '';
  if (video) video.src = '';
});
