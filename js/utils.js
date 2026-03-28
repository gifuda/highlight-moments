/* ============================================
   工具函数
   日期格式化、生成ID、DOM 创建辅助等
   ============================================ */

const Utils = {
  /* 生成唯一 ID */
  uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  },

  /* 格式化时间 */
  formatTime(iso) {
    const d = new Date(iso);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  },

  /* 格式化日期分组标题 */
  formatDate(iso) {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 今天 / 昨天
    if (d.toDateString() === today.toDateString()) return '今天';
    if (d.toDateString() === yesterday.toDateString()) return '昨天';

    // 今年内：3月26日 周四
    // 跨年：2025年3月26日
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekday = weekdays[d.getDay()];

    if (d.getFullYear() === today.getFullYear()) {
      return `${month}月${day}日 ${weekday}`;
    }
    return `${d.getFullYear()}年${month}月${day}日`;
  },

  /* 完整日期时间（编辑页用） */
  formatDateTime(iso) {
    const d = new Date(iso);
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')} ${this.formatTime(iso)}`;
  },

  /* 友好的文件大小 */
  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  },

  /* 创建 DOM 元素的快捷方式 */
  dom(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const [key, val] of Object.entries(attrs)) {
      if (key === 'className') el.className = val;
      else if (key === 'innerHTML') el.innerHTML = val;
      else if (key === 'textContent') el.textContent = val;
      else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), val);
      else el.setAttribute(key, val);
    }
    for (const child of children) {
      if (typeof child === 'string') el.appendChild(document.createTextNode(child));
      else if (child) el.appendChild(child);
    }
    return el;
  },

  /* 防抖 */
  debounce(fn, ms = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  },

  /* 显示 toast 提示 */
  toast(msg, duration = 2000) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), duration);
  },

  /* 显示确认弹窗，返回 Promise<boolean> */
  confirm(title, message) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal">
          <h3>${title}</h3>
          <p>${message}</p>
          <div class="modal-actions">
            <button class="modal-cancel">取消</button>
            <button class="modal-confirm">确认</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      overlay.querySelector('.modal-cancel').onclick = () => {
        overlay.remove();
        resolve(false);
      };
      overlay.querySelector('.modal-confirm').onclick = () => {
        overlay.remove();
        resolve(true);
      };
      // 点背景关闭
      overlay.addEventListener('click', e => {
        if (e.target === overlay) { overlay.remove(); resolve(false); }
      });
    });
  }
};
