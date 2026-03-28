/* ============================================
   设置页面
   管理空间名称、成员、存储用量、清空数据
   ============================================ */

const Settings = {
  render() {
    const container = document.getElementById('app-container');
    const config = Store.getConfig();
    const user = authService.getCurrentUser();
    const spaces = invitationService.getUserSpaces(user?.id || '');

    if (!config) {
      Router.navigate('/');
      return;
    }

    const recordCount = Store.getRecords().length;

    container.innerHTML = `
      <div class="page">
        <h2 style="font-size:22px; font-weight:600; margin-bottom:20px;">设置</h2>

        <div class="settings-section">
          <h3>当前用户</h3>
          <div class="settings-row">
            <span class="settings-label">手机号</span>
            <span class="settings-value">${user?.phone || '未登录'}</span>
          </div>
          <div class="settings-row">
            <span class="settings-label">姓名</span>
            <span class="settings-value">${user?.name || '未登录'}</span>
          </div>
          <div class="settings-row">
            <span class="settings-label">颜色</span>
            <span class="settings-value">
              <div class="author-dot-lg" style="background:${user?.color || '#86868B'}"></div>
            </span>
          </div>
          <button class="btn-secondary" id="btn-logout" style="margin-top:10px;">退出登录</button>
        </div>

        <div class="settings-section">
          <h3>空间信息</h3>
          <div class="settings-row">
            <span class="settings-label">空间名称</span>
            <input type="text" class="settings-input" id="set-space-name" value="${config.spaceName || '高光时刻'}">
          </div>
          <div class="settings-row">
            <span class="settings-label">记录总数</span>
            <span class="settings-value">${recordCount} 条</span>
          </div>
          <div class="settings-row">
            <span class="settings-label">创建时间</span>
            <span class="settings-value">${Utils.formatDateTime(config.createdAt)}</span>
          </div>
        </div>

        <div class="settings-section">
          <h3>云盘设置（坚果云）</h3>
          <p style="font-size:13px; color:var(--text-secondary); margin-bottom:10px;">
            连接坚果云实现多人数据互通。需要先在坚果云「安全选项 → 第三方应用管理」中生成应用密码。
          </p>
          <div class="settings-row">
            <span class="settings-label">坚果云邮箱</span>
            <input type="email" class="settings-input" id="set-cloud-username" placeholder="your@email.com" value="${user?.cloudConfig?.username || ''}">
          </div>
          <div class="settings-row">
            <span class="settings-label">应用密码</span>
            <input type="password" class="settings-input" id="set-cloud-password" placeholder="第三方应用密码" value="${user?.cloudConfig?.password || ''}">
          </div>
          <div style="display:flex; gap:10px; margin-top:10px;">
            <button class="btn-secondary" id="btn-test-cloud">测试连接</button>
            <button class="btn-primary" id="btn-save-cloud">保存配置</button>
          </div>
          <div class="settings-row" style="margin-top:8px;">
            <span class="settings-label">同步状态</span>
            <span class="settings-value" id="cloud-status">${user?.cloudConfig?.username ? '已配置' : '未配置'}</span>
          </div>
        </div>

        <div class="settings-section">
          <h3>空间管理</h3>
          ${spaces.length > 0 ? `
            <div class="settings-row">
              <span class="settings-label">当前空间</span>
              <span class="settings-value">${spaces[0]?.name || '未创建空间'}</span>
            </div>
            <div class="settings-row">
              <span class="settings-label">成员数量</span>
              <span class="settings-value">${invitationService.getSpaceMembers(spaces[0]?.id || '').length} 人</span>
            </div>
          ` : `
            <div class="settings-row">
              <span class="settings-label">状态</span>
              <span class="settings-value">未创建空间</span>
            </div>
          `}
          <button class="btn-primary" id="btn-create-space" style="margin-top:10px;">创建空间</button>
        </div>

        <div class="settings-section">
          <h3>邀请管理</h3>
          <div id="settings-invitations">
            ${spaces.length > 0 ? invitationService.getSpaceInvitations(spaces[0]?.id || '').map(i => `
              <div class="invitation-item">
                <div class="invitation-code">${i.code}</div>
                <div class="invitation-info">
                  <span>可用次数: ${i.maxUses - i.currentUses}/${i.maxUses}</span>
                  <span>有效期至: ${Utils.formatDateTime(i.expiresAt)}</span>
                </div>
                <button class="btn-secondary" data-code="${i.code}">复制</button>
              </div>
            `).join('') : ''}
          </div>
          ${spaces.length > 0 ? `
            <button class="btn-primary" id="btn-create-invitation" style="margin-top:10px;">生成新邀请码</button>
          ` : ''}
        </div>

        <div class="settings-section">
          <h3>成员管理</h3>
          <div id="settings-authors">
            ${config.authors.map(a => `
              <div class="author-item" data-id="${a.id}">
                <div class="author-dot-lg" style="background:${a.color}"></div>
                <span class="author-name-text">${a.name}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="settings-section">
          <h3>存储用量</h3>
          <div class="settings-row">
            <span class="settings-label">已用空间</span>
            <span class="settings-value" id="storage-usage">计算中...</span>
          </div>
        </div>

        <div class="settings-section">
          <h3>关于</h3>
          <div class="settings-row">
            <span class="settings-label">版本</span>
            <span class="settings-value">1.0.0 Demo</span>
          </div>
          <div class="settings-row">
            <span class="settings-label">数据存储</span>
            <span class="settings-value">本地浏览器</span>
          </div>
        </div>

        <button class="btn-danger" id="btn-clear-all">清空所有数据</button>
        <div style="height:20px;"></div>
      </div>
    `;

    // 修改空间名称
    container.querySelector('#set-space-name').addEventListener('change', e => {
      config.spaceName = e.target.value.trim() || '高光时刻';
      Store.saveConfig(config);
      document.getElementById('header-title').textContent = config.spaceName;
      Utils.toast('空间名称已更新');
    });

    // 退出登录
    container.querySelector('#btn-logout').addEventListener('click', () => {
      authService.clearCurrentUser();
      Utils.toast('已退出登录');
      Router.navigate('/');
    });

    // 测试云盘连接
    container.querySelector('#btn-test-cloud').addEventListener('click', async () => {
      const username = document.getElementById('set-cloud-username').value.trim();
      const password = document.getElementById('set-cloud-password').value.trim();

      if (!username || !password) {
        Utils.toast('请填写坚果云邮箱和应用密码');
        return;
      }

      try {
        Utils.toast('正在连接...');
        const testProvider = new WebDAVProvider({
          proxyUrl: 'http://localhost:3001/proxy',
          username,
          password
        });
        await testProvider.testConnection();
        Utils.toast('连接成功！坚果云已就绪');
        document.getElementById('cloud-status').textContent = '连接正常 ✓';
        document.getElementById('cloud-status').style.color = '#34C759';
      } catch (err) {
        Utils.toast('连接失败: ' + err.message);
        document.getElementById('cloud-status').textContent = '连接失败 ✗';
        document.getElementById('cloud-status').style.color = '#FF3B30';
      }
    });

    // 保存云盘配置
    container.querySelector('#btn-save-cloud').addEventListener('click', () => {
      const username = document.getElementById('set-cloud-username').value.trim();
      const password = document.getElementById('set-cloud-password').value.trim();

      if (!username || !password) {
        Utils.toast('请填写完整的坚果云信息');
        return;
      }

      if (user) {
        user.cloudConfig = {
          provider: 'webdav',
          proxyUrl: 'http://localhost:3001/proxy',
          username,
          password
        };
        // 保存到用户列表
        const users = Store.getUsers().map(u =>
          u.id === user.id ? user : u
        );
        Store.saveUsers(users);
        authService.setCurrentUser(user);
        Utils.toast('云盘配置已保存');
      }
    });

    // 创建空间
    container.querySelector('#btn-create-space').addEventListener('click', async () => {
      const spaceName = prompt('请输入空间名称：');
      if (!spaceName) return;

      try {
        const space = invitationService.createSpace(spaceName, user.id);
        // 确保 config 存在
        if (!Store.getConfig()) {
          Store.saveConfig({
            version: '1.0.0',
            spaceName,
            authors: [],
            currentAuthor: user.id,
            createdAt: new Date().toISOString()
          });
        }
        document.getElementById('header-title').textContent = spaceName;
        Utils.toast('空间创建成功！');
        Settings.render();
      } catch (err) {
        Utils.toast('创建空间失败: ' + err.message);
      }
    });

    // 生成邀请码
    container.querySelector('#btn-create-invitation').addEventListener('click', async () => {
      if (spaces.length === 0) {
        Utils.toast('请先创建空间');
        return;
      }

      try {
        const invitation = invitationService.createInvitation(spaces[0].id, user.id);
        Utils.toast(`邀请码生成成功: ${invitation.code}`);
        Settings.render(); // 重新渲染设置页面
      } catch (err) {
        Utils.toast('生成邀请码失败: ' + err.message);
      }
    });

    // 复制邀请码
    container.querySelectorAll('.btn-secondary[data-code]').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.dataset.code;
        navigator.clipboard.writeText(code).then(() => {
          Utils.toast('邀请码已复制到剪贴板');
        }).catch(() => {
          Utils.toast('复制失败，请手动复制');
        });
      });
    });

    // 清空数据
    container.querySelector('#btn-clear-all').addEventListener('click', async () => {
      const ok = await Utils.confirm('清空所有数据', '此操作将删除所有记录和照片，且无法恢复。确定要继续吗？');
      if (ok) {
        const ok2 = await Utils.confirm('再次确认', '真的要删除所有数据吗？');
        if (ok2) {
          await Store.clearAll();
          Router.navigate('/');
          Utils.toast('数据已清空');
        }
      }
    });

    // 计算存储用量
    Store.getStorageUsage().then(({ localStorage: ls, indexedDB: idb }) => {
      const total = ls + idb;
      document.getElementById('storage-usage').textContent = Utils.formatSize(total);
    });
  }
};
