/* ============================================
   用户注册页面
   实现手机号注册和登录
   支持填写邀请码直接加入空间（名字需唯一）
   ============================================ */

const Register = {
  render() {
    const container = document.getElementById('app-container');

    // 检查 URL 是否带了邀请码参数
    const urlParams = new URLSearchParams(window.location.search);
    const prefillCode = urlParams.get('code') || '';

    container.innerHTML = `
      <div class="page">
        <h2 style="font-size:22px; font-weight:600; margin-bottom:20px;">用户注册</h2>

        <div class="settings-section">
          <h3>邀请码 <span style="font-weight:400; color:var(--text-secondary);">（选填）</span></h3>
          <div class="settings-row">
            <input type="text" class="settings-input" id="reg-invite-code" placeholder="有邀请码？粘贴到这里" value="${prefillCode}">
          </div>
          <div id="reg-space-hint" style="display:none; margin-top:6px; font-size:13px; color:#007AFF; font-weight:500;"></div>
        </div>

        <div class="settings-section">
          <h3>手机号</h3>
          <div class="settings-row">
            <input type="tel" class="settings-input" id="reg-phone" placeholder="请输入手机号" maxlength="11">
          </div>
        </div>

        <div class="settings-section">
          <h3>在空间中的名字</h3>
          <div class="settings-row">
            <input type="text" class="settings-input" id="reg-name" placeholder="给自己取个名字">
          </div>
          <div id="reg-name-hint" style="display:none; margin-top:4px; font-size:12px;"></div>
        </div>

        <div class="settings-section">
          <h3>颜色</h3>
          <div class="settings-row">
            <div style="display:flex; gap:10px; align-items:center;">
              <div class="color-dot selected" style="background:#FF6B6B" data-color="#FF6B6B"></div>
              <div class="color-dot" style="background:#4ECDC4" data-color="#4ECDC4"></div>
              <div class="color-dot" style="background:#FFD93D" data-color="#FFD93D"></div>
              <div class="color-dot" style="background:#6C5CE7" data-color="#6C5CE7"></div>
              <div class="color-dot" style="background:#FF8A5C" data-color="#FF8A5C"></div>
              <div class="color-dot" style="background:#A8E6CF" data-color="#A8E6CF"></div>
            </div>
          </div>
        </div>

        <button class="btn-primary" id="btn-register" style="width:100%; margin-top:20px;">注册</button>
        <div style="text-align:center; margin-top:20px;">
          <button class="btn-secondary" id="btn-login" style="padding:10px 20px;">已有账号？登录</button>
        </div>
      </div>
    `;

    const nameHint = document.getElementById('reg-name-hint');
    const spaceHint = document.getElementById('reg-space-hint');

    // 邀请码输入时解析并提示空间名
    const codeInput = document.getElementById('reg-invite-code');
    codeInput.addEventListener('input', () => {
      const code = codeInput.value.trim();
      if (code) {
        const info = invitationService.parseInviteCode(code);
        if (info) {
          spaceHint.textContent = '将加入空间：' + info.spaceName;
          spaceHint.style.display = 'block';
        } else {
          spaceHint.textContent = '邀请码格式不正确';
          spaceHint.style.color = '#FF3B30';
          spaceHint.style.display = 'block';
        }
      } else {
        spaceHint.style.display = 'none';
      }
    });

    // 初始触发一次（如果有预填的邀请码）
    if (prefillCode) codeInput.dispatchEvent(new Event('input'));

    // 名字输入时检查唯一性（有邀请码时）
    const nameInput = document.getElementById('reg-name');
    nameInput.addEventListener('input', () => {
      const code = codeInput.value.trim();
      const name = nameInput.value.trim();
      if (!code || !name) {
        nameHint.style.display = 'none';
        return;
      }
      const info = invitationService.parseInviteCode(code);
      if (!info) return;

      const unique = invitationService.isNameUniqueInSpace(info.spaceId, name);
      nameHint.style.display = 'block';
      if (unique) {
        nameHint.textContent = '这个名字可以使用';
        nameHint.style.color = '#34C759';
      } else {
        nameHint.textContent = '这个名字已被空间内其他成员使用';
        nameHint.style.color = '#FF3B30';
      }
    });

    // 颜色选择
    container.querySelectorAll('.color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        container.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
        dot.classList.add('selected');
      });
    });

    // 注册按钮
    container.querySelector('#btn-register').addEventListener('click', async () => {
      const phone = document.getElementById('reg-phone').value.trim();
      const name = nameInput.value.trim();
      const color = container.querySelector('.color-dot.selected').dataset.color;
      const inviteCode = codeInput.value.trim();

      if (!phone || !name) {
        Utils.toast('请填写完整的注册信息');
        return;
      }

      if (!/^1[3-9]\d{9}$/.test(phone)) {
        Utils.toast('请输入正确的11位手机号');
        return;
      }

      // 有邀请码时检查名字唯一性
      if (inviteCode) {
        const info = invitationService.parseInviteCode(inviteCode);
        if (!info) {
          Utils.toast('邀请码无效');
          return;
        }
        if (!invitationService.isNameUniqueInSpace(info.spaceId, name)) {
          Utils.toast('这个名字已被空间内其他成员使用，请换一个');
          return;
        }
      }

      try {
        const user = await userService.register(phone, name, color);
        authService.setCurrentUser(user);

        if (inviteCode) {
          try {
            invitationService.joinSpace(inviteCode, user.id);
            // 初始化云盘同步（邀请码可能携带了云盘配置）
            await syncManager.init();
            if (syncManager.isConfigured()) {
              syncManager.startAutoSync();
            }
            Utils.toast('注册成功，已加入空间！');
            Router.navigate('/');
          } catch (err) {
            Utils.toast('注册成功，但邀请码无效: ' + err.message);
            Router.navigate('/join');
          }
        } else {
          Utils.toast('注册成功！');
          Router.navigate('/join');
        }
      } catch (err) {
        Utils.toast('注册失败: ' + err.message);
      }
    });

    // 登录按钮
    container.querySelector('#btn-login').addEventListener('click', () => {
      Router.navigate('/login');
    });
  }
};
