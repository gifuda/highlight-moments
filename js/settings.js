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
    const currentPreset = user?.cloudConfig?.preset || '';
    // 判断是否为空间创建者（只有创建者能配置云盘）
    const isCreator = spaces.length > 0 && spaces[0].creatorId === user?.id;

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

        ${isCreator ? `
        <div class="settings-section">
          <h3>云盘同步</h3>
          <p style="font-size:13px; color:var(--text-secondary); margin-bottom:12px;">
            绑定云盘可实现多人数据互通。不绑定也可正常使用，数据仅存本地。
          </p>

          <div id="cloud-provider-cards" style="display:flex; flex-direction:column; gap:8px;">
            <div class="cloud-card" data-type="" style="display:flex; align-items:center; gap:12px; padding:14px; border-radius:12px; border:2px solid #E5E5EA; cursor:pointer;">
              <div style="width:36px; height:36px; border-radius:8px; background:#F5F5F7; display:flex; align-items:center; justify-content:center; font-size:18px;">📱</div>
              <div style="flex:1;">
                <div style="font-weight:600; font-size:15px;">仅存本地</div>
                <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">数据保存在浏览器中，无需配置</div>
              </div>
            </div>

            <div class="cloud-card" data-type="jianguoyun" style="display:flex; align-items:center; gap:12px; padding:14px; border-radius:12px; border:2px solid #E5E5EA; cursor:pointer;">
              <div style="width:36px; height:36px; border-radius:8px; background:#E8F5E9; display:flex; align-items:center; justify-content:center; font-size:18px;">🥜</div>
              <div style="flex:1;">
                <div style="font-weight:600; font-size:15px;">坚果云</div>
                <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">国内稳定，需运行本地中转服务</div>
              </div>
            </div>

            <div class="cloud-card" data-type="nextcloud" style="display:flex; align-items:center; gap:12px; padding:14px; border-radius:12px; border:2px solid #E5E5EA; cursor:pointer;">
              <div style="width:36px; height:36px; border-radius:8px; background:#E3F2FD; display:flex; align-items:center; justify-content:center; font-size:18px;">☁️</div>
              <div style="flex:1;">
                <div style="font-weight:600; font-size:15px;">Nextcloud / ownCloud</div>
                <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">自建私有云，功能强大</div>
              </div>
            </div>

            <div class="cloud-card" data-type="synology" style="display:flex; align-items:center; gap:12px; padding:14px; border-radius:12px; border:2px solid #E5E5EA; cursor:pointer;">
              <div style="width:36px; height:36px; border-radius:8px; background:#FFF3E0; display:flex; align-items:center; justify-content:center; font-size:18px;">💾</div>
              <div style="flex:1;">
                <div style="font-weight:600; font-size:15px;">群晖 NAS</div>
                <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">群晖 WebDAV 服务</div>
              </div>
            </div>

            <div class="cloud-card" data-type="custom" style="display:flex; align-items:center; gap:12px; padding:14px; border-radius:12px; border:2px solid #E5E5EA; cursor:pointer;">
              <div style="width:36px; height:36px; border-radius:8px; background:#F3E5F5; display:flex; align-items:center; justify-content:center; font-size:18px;">🔌</div>
              <div style="flex:1;">
                <div style="font-weight:600; font-size:15px;">其他 WebDAV</div>
                <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">任意支持 WebDAV 协议的服务</div>
              </div>
            </div>
          </div>

          <!-- 配置表单区域 -->
          <div id="cloud-config-form" style="margin-top:16px; display:none;">

            <!-- 坚果云引导 -->
            <div class="cloud-field" data-for="jianguoyun" style="display:none; background:#F0F9F0; border-radius:10px; padding:14px; margin-bottom:12px;">
              <div style="font-size:13px; font-weight:600; margin-bottom:8px;">如何获取坚果云 API 接口信息</div>
              <div style="font-size:12px; color:var(--text-secondary); line-height:1.8;">
                1. 登录坚果云网页版 → 右上角头像 → <strong>安全选项</strong><br>
                2. 找到「<strong>第三方应用管理</strong>」→ 添加应用<br>
                3. 生成一个 <strong>应用专用密码</strong>（不是登录密码）<br>
                4. 本地启动中转服务：<code style="background:#E8E8E8; padding:2px 6px; border-radius:4px;">node server/proxy.js</code><br>
                5. 将邮箱作为 API 账号，应用密码作为 API 密钥填入下方
              </div>
            </div>

            <!-- Nextcloud 引导 -->
            <div class="cloud-field" data-for="nextcloud" style="display:none; background:#F0F4FF; border-radius:10px; padding:14px; margin-bottom:12px;">
              <div style="font-size:13px; font-weight:600; margin-bottom:8px;">如何获取 Nextcloud API 接口信息</div>
              <div style="font-size:12px; color:var(--text-secondary); line-height:1.8;">
                1. 登录 Nextcloud → 设置 → <strong>安全</strong><br>
                2. 创建一个 <strong>应用密码</strong><br>
                3. WebDAV 地址格式：<code style="background:#E8E8E8; padding:2px 6px; border-radius:4px;">https://你的域名/remote.php/dav/files/用户名/</code><br>
                4. 将 WebDAV 地址填入下方，用户名和应用密码作为 API 密钥
              </div>
            </div>

            <!-- 群晖引导 -->
            <div class="cloud-field" data-for="synology" style="display:none; background:#FFF8E1; border-radius:10px; padding:14px; margin-bottom:12px;">
              <div style="font-size:13px; font-weight:600; margin-bottom:8px;">如何获取群晖 WebDAV API 接口信息</div>
              <div style="font-size:12px; color:var(--text-secondary); line-height:1.8;">
                1. DSM 控制面板 → <strong>WebDAV</strong> → 启用<br>
                2. WebDAV 地址格式：<code style="background:#E8E8E8; padding:2px 6px; border-radius:4px;">https://你的IP:5006/</code><br>
                3. 使用 DSM 账号或创建专用账号的应用令牌
              </div>
            </div>

            <!-- 自定义引导 -->
            <div class="cloud-field" data-for="custom" style="display:none; background:#F8F0FF; border-radius:10px; padding:14px; margin-bottom:12px;">
              <div style="font-size:13px; font-weight:600; margin-bottom:8px;">如何获取 WebDAV API 接口信息</div>
              <div style="font-size:12px; color:var(--text-secondary); line-height:1.8;">
                1. 在你的网盘/私有云服务中启用 <strong>WebDAV</strong> 功能<br>
                2. 获取 WebDAV 服务的 <strong>API 地址</strong>（通常在帮助文档中）<br>
                3. 生成一个 <strong>访问令牌</strong> 或应用专用密钥<br>
                4. 将 API 地址和令牌填入下方
              </div>
            </div>

            <!-- API 地址（nextcloud/synology/custom） -->
            <div class="settings-row cloud-field" data-for="nextcloud,synology,custom" style="display:none;">
              <span class="settings-label">API 地址</span>
              <input type="url" class="settings-input" id="set-cloud-server" placeholder="https://your-server.com/dav/" value="${user?.cloudConfig?.serverUrl || ''}">
            </div>

            <!-- 坚果云：代理地址 -->
            <div class="settings-row cloud-field" data-for="jianguoyun" style="display:none;">
              <span class="settings-label">代理服务地址</span>
              <input type="url" class="settings-input" id="set-cloud-proxy" placeholder="http://localhost:3001/proxy" value="${user?.cloudConfig?.proxyUrl || 'http://localhost:3001/proxy'}">
            </div>

            <!-- API 账号 -->
            <div class="settings-row cloud-field" data-for="jianguoyun,nextcloud,synology,custom" style="display:none;">
              <span class="settings-label">API 账号</span>
              <input type="text" class="settings-input" id="set-cloud-username" placeholder="应用账号或邮箱" value="${user?.cloudConfig?.username || ''}">
            </div>

            <!-- API 密钥 -->
            <div class="settings-row cloud-field" data-for="jianguoyun,nextcloud,synology,custom" style="display:none;">
              <span class="settings-label">API 密钥</span>
              <input type="password" class="settings-input" id="set-cloud-password" placeholder="应用专用密码或访问令牌" value="${user?.cloudConfig?.password || ''}">
            </div>

            <!-- 可选代理（非坚果云） -->
            <div class="settings-row cloud-field" data-for="nextcloud,synology,custom" style="display:none;">
              <span class="settings-label">代理地址（选填）</span>
              <input type="url" class="settings-input" id="set-cloud-proxy-general" placeholder="遇跨域问题时填写" value="${user?.cloudConfig?.proxyUrl || ''}">
            </div>

            <div style="display:flex; gap:10px; margin-top:12px;">
              <button class="btn-secondary" id="btn-test-cloud">测试连接</button>
              <button class="btn-primary" id="btn-save-cloud">保存配置</button>
            </div>
          </div>

          <div class="settings-row" style="margin-top:8px;">
            <span class="settings-label">同步状态</span>
            <span class="settings-value" id="cloud-status">${user?.cloudConfig?.username ? '已配置' : '未配置'}</span>
          </div>
        </div>
        ` : ''}

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
            <span class="settings-value">${user?.cloudConfig?.provider && isCreator ? '本地 + 云盘' : '本地浏览器'}</span>
          </div>
        </div>

        <button class="btn-danger" id="btn-clear-all">清空所有数据</button>
        <div style="height:20px;"></div>
      </div>
    `;

    // ===== 事件绑定 =====

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

    // ===== 云盘卡片选择（仅创建者可见） =====
    if (isCreator) {
    let _selectedPreset = currentPreset || '';
    const _highlightCard = (type) => {
      _selectedPreset = type;
      container.querySelectorAll('.cloud-card').forEach(c => {
        if (c.dataset.type === type) {
          c.style.borderColor = '#007AFF';
          c.style.background = '#F0F5FF';
        } else {
          c.style.borderColor = '#E5E5EA';
          c.style.background = 'transparent';
        }
      });
    };

    // 初始化高亮
    if (currentPreset) {
      _highlightCard(currentPreset);
      document.getElementById('cloud-config-form').style.display = 'block';
      _showFieldsFor(currentPreset);
    } else {
      _highlightCard('');
    }

    function _showFieldsFor(preset) {
      container.querySelectorAll('.cloud-field').forEach(field => {
        const forTypes = field.dataset.for?.split(',') || [];
        field.style.display = forTypes.includes(preset) ? 'block' : 'none';
        // settings-row 需要 flex
        if (forTypes.includes(preset) && field.classList.contains('settings-row')) {
          field.style.display = 'flex';
        }
      });
    }

    container.querySelectorAll('.cloud-card').forEach(card => {
      card.addEventListener('click', () => {
        const preset = card.dataset.type;
        _highlightCard(preset);

        const form = document.getElementById('cloud-config-form');
        form.style.display = preset ? 'block' : 'none';

        if (preset) _showFieldsFor(preset);
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

    function _buildCloudConfig() {
      const preset = _selectedPreset;
      if (!preset) {
        Utils.toast('请先选择云盘类型');
        return null;
      }

      const username = document.getElementById('set-cloud-username').value.trim();
      const password = document.getElementById('set-cloud-password').value.trim();
      if (!username || !password) {
        Utils.toast('请填写 API 账号和密钥');
        return null;
      }

      const cfg = { provider: 'webdav', preset, username, password };

      if (preset === 'jianguoyun') {
        cfg.serverUrl = 'https://dav.jianguoyun.com/dav';
        cfg.proxyUrl = document.getElementById('set-cloud-proxy').value.trim() || 'http://localhost:3001/proxy';
      } else {
        cfg.serverUrl = document.getElementById('set-cloud-server')?.value.trim() || '';
        cfg.proxyUrl = document.getElementById('set-cloud-proxy-general')?.value.trim() || '';
        if (!cfg.serverUrl) {
          Utils.toast('请填写 API 地址');
          return null;
        }
      }

      return cfg;
    }

    function _toProviderConfig(cloudConfig) {
      return {
        serverUrl: cloudConfig.serverUrl,
        proxyUrl: cloudConfig.proxyUrl || '',
        username: cloudConfig.username,
        password: cloudConfig.password
      };
    }

    } // end isCreator

    // 创建空间
    container.querySelector('#btn-create-space').addEventListener('click', async () => {
      const spaceName = prompt('请输入空间名称：');
      if (!spaceName) return;

      try {
        const space = invitationService.createSpace(spaceName, user.id);
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
