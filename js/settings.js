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
          <h3>云盘同步</h3>
          <p style="font-size:13px; color:var(--text-secondary); margin-bottom:10px;">
            绑定云盘后可实现多人数据互通。不绑定也可以正常使用，数据仅存本地。
          </p>

          <div class="settings-row" style="flex-direction:column; align-items:stretch;">
            <label class="settings-label" style="margin-bottom:6px;">选择云盘类型</label>
            <select id="set-cloud-type" style="padding:10px 12px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-secondary); color:var(--text-primary); font-size:15px; width:100%;">
              <option value="" ${!user?.cloudConfig?.provider ? 'selected' : ''}>不同步（仅本地存储）</option>
              <option value="jianguoyun" ${user?.cloudConfig?.preset === 'jianguoyun' ? 'selected' : ''}>坚果云</option>
              <option value="nextcloud" ${user?.cloudConfig?.preset === 'nextcloud' ? 'selected' : ''}>Nextcloud / ownCloud</option>
              <option value="synology" ${user?.cloudConfig?.preset === 'synology' ? 'selected' : ''}>群晖 WebDAV</option>
              <option value="custom" ${user?.cloudConfig?.preset === 'custom' ? 'selected' : ''}>自定义 WebDAV（私有云等）</option>
            </select>
          </div>

          <div id="cloud-config-form" style="margin-top:12px; display:${user?.cloudConfig?.provider ? 'block' : 'none'};">
            <!-- WebDAV 服务器地址（仅 nextcloud/synology/custom 显示） -->
            <div class="settings-row cloud-field" data-for="nextcloud,synology,custom" style="display:${['nextcloud','synology','custom'].includes(user?.cloudConfig?.preset) ? 'flex' : 'none'};">
              <span class="settings-label">服务器地址</span>
              <input type="url" class="settings-input" id="set-cloud-server" placeholder="https://your-server.com/remote.php/dav/" value="${user?.cloudConfig?.serverUrl || ''}">
            </div>

            <!-- 代理地址（仅坚果云需要） -->
            <div class="settings-row cloud-field" data-for="jianguoyun" style="display:${user?.cloudConfig?.preset === 'jianguoyun' ? 'flex' : 'none'};">
              <span class="settings-label">代理地址</span>
              <input type="url" class="settings-input" id="set-cloud-proxy" placeholder="http://localhost:3001/proxy" value="${user?.cloudConfig?.proxyUrl || 'http://localhost:3001/proxy'}">
            </div>
            <p class="cloud-field" data-for="jianguoyun" style="display:${user?.cloudConfig?.preset === 'jianguoyun' ? 'block' : 'none'}; font-size:12px; color:var(--text-secondary); margin:4px 0 8px;">
              坚果云不支持浏览器直连，需要本地运行中转服务。
            </p>

            <!-- 用户名 -->
            <div class="settings-row cloud-field" data-for="jianguoyun,nextcloud,synology,custom">
              <span class="settings-label">账号 / 邮箱</span>
              <input type="text" class="settings-input" id="set-cloud-username" placeholder="your@email.com" value="${user?.cloudConfig?.username || ''}">
            </div>

            <!-- 密码 -->
            <div class="settings-row cloud-field" data-for="jianguoyun,nextcloud,synology,custom">
              <span class="settings-label">密码</span>
              <input type="password" class="settings-input" id="set-cloud-password" placeholder="应用密码" value="${user?.cloudConfig?.password || ''}">
            </div>
            <p class="cloud-field" data-for="jianguoyun" style="display:${user?.cloudConfig?.preset === 'jianguoyun' ? 'block' : 'none'}; font-size:12px; color:var(--text-secondary); margin:4px 0 8px;">
              在坚果云「设置 → 安全选项 → 第三方应用管理」中生成应用密码。
            </p>
            <p class="cloud-field" data-for="nextcloud,synology,custom" style="display:${['nextcloud','synology','custom'].includes(user?.cloudConfig?.preset) ? 'block' : 'none'}; font-size:12px; color:var(--text-secondary); margin:4px 0 8px;">
              填写 WebDAV 登录密码。如服务器支持 CORS 可不填代理。
            </p>

            <!-- 代理地址（可选，非坚果云） -->
            <div class="settings-row cloud-field" data-for="nextcloud,synology,custom" style="display:${['nextcloud','synology','custom'].includes(user?.cloudConfig?.preset) ? 'flex' : 'none'};">
              <span class="settings-label">代理地址 <span style="color:var(--text-secondary); font-weight:400;">（选填）</span></span>
              <input type="url" class="settings-input" id="set-cloud-proxy-general" placeholder="留空则直连服务器" value="${user?.cloudConfig?.proxyUrl || ''}">
            </div>

            <div style="display:flex; gap:10px; margin-top:10px;">
              <button class="btn-secondary" id="btn-test-cloud">测试连接</button>
              <button class="btn-primary" id="btn-save-cloud">保存配置</button>
            </div>
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
            ${spaces.length > 0 ? (() => {
              const code = invitationService.generateInviteCode(spaces[0].id, spaces[0].name);
              return `
                <div class="invitation-item">
                  <div class="invitation-code" style="word-break:break-all; font-size:13px; letter-spacing:1px;">${code}</div>
                  <button class="btn-secondary" data-code="${code}" style="margin-top:8px;">复制邀请码</button>
                </div>
              `;
            })() : '<p style="color:var(--text-secondary); font-size:13px;">请先创建空间</p>'}
          </div>
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
            <span class="settings-value">${user?.cloudConfig?.provider ? '本地 + 云盘' : '本地浏览器'}</span>
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
      userService.clearCurrentUser();
      Utils.toast('已退出登录');
      Router.navigate('/login');
    });

    // 云盘类型切换
    container.querySelector('#set-cloud-type').addEventListener('change', e => {
      const preset = e.target.value;
      const form = document.getElementById('cloud-config-form');
      form.style.display = preset ? 'block' : 'none';

      // 显示/隐藏对应字段
      container.querySelectorAll('.cloud-field').forEach(field => {
        const forTypes = field.dataset.for?.split(',') || [];
        field.style.display = forTypes.includes(preset) ? (field.tagName === 'P' ? 'block' : 'flex') : 'none';
      });
    });

    // 测试云盘连接
    container.querySelector('#btn-test-cloud').addEventListener('click', async () => {
      const cloudConfig = _buildCloudConfig();
      if (!cloudConfig) return;

      try {
        Utils.toast('正在连接...');
        const providerConfig = _toProviderConfig(cloudConfig);
        const testProvider = new WebDAVProvider(providerConfig);
        await testProvider.testConnection();
        Utils.toast('连接成功！云盘已就绪');
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
      const cloudConfig = _buildCloudConfig();
      if (!cloudConfig) return;

      if (user) {
        user.cloudConfig = cloudConfig;
        const users = Store.getUsers().map(u =>
          u.id === user.id ? user : u
        );
        Store.saveUsers(users);
        authService.setCurrentUser(user);
        Utils.toast('云盘配置已保存');
        document.getElementById('cloud-status').textContent = '已配置';
        document.getElementById('cloud-status').style.color = '';
      }
    });

    /* 从表单构建云盘配置 */
    function _buildCloudConfig() {
      const preset = document.getElementById('set-cloud-type').value;
      if (!preset) {
        Utils.toast('请先选择云盘类型');
        return null;
      }

      const username = document.getElementById('set-cloud-username').value.trim();
      const password = document.getElementById('set-cloud-password').value.trim();
      if (!username || !password) {
        Utils.toast('请填写账号和密码');
        return null;
      }

      const config = {
        provider: 'webdav',
        preset,
        username,
        password
      };

      // 根据类型填充服务器地址
      if (preset === 'jianguoyun') {
        config.serverUrl = 'https://dav.jianguoyun.com/dav';
        config.proxyUrl = document.getElementById('set-cloud-proxy').value.trim() || 'http://localhost:3001/proxy';
      } else if (preset === 'nextcloud') {
        config.serverUrl = document.getElementById('set-cloud-server').value.trim();
        config.proxyUrl = document.getElementById('set-cloud-proxy-general').value.trim();
        if (!config.serverUrl) { Utils.toast('请填写 Nextcloud 服务器地址'); return null; }
      } else if (preset === 'synology') {
        config.serverUrl = document.getElementById('set-cloud-server').value.trim();
        config.proxyUrl = document.getElementById('set-cloud-proxy-general').value.trim();
        if (!config.serverUrl) { Utils.toast('请填写群晖服务器地址'); return null; }
      } else if (preset === 'custom') {
        config.serverUrl = document.getElementById('set-cloud-server').value.trim();
        config.proxyUrl = document.getElementById('set-cloud-proxy-general').value.trim();
        if (!config.serverUrl) { Utils.toast('请填写 WebDAV 服务器地址'); return null; }
      }

      return config;
    }

    /* 将用户配置转为 WebDAVProvider 构造参数 */
    function _toProviderConfig(cloudConfig) {
      return {
        serverUrl: cloudConfig.serverUrl,
        proxyUrl: cloudConfig.proxyUrl || '',
        username: cloudConfig.username,
        password: cloudConfig.password
      };
    }

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
