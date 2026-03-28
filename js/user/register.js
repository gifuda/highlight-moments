/* ============================================
   用户注册页面
   实现手机号注册和登录
   ============================================ */

const Register = {
  render() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
      <div class="page">
        <h2 style="font-size:22px; font-weight:600; margin-bottom:20px;">用户注册</h2>

        <div class="settings-section">
          <h3>手机号</h3>
          <div class="settings-row">
            <input type="tel" class="settings-input" id="reg-phone" placeholder="请输入手机号" maxlength="11">
          </div>
        </div>

        <div class="settings-section">
          <h3>姓名</h3>
          <div class="settings-row">
            <input type="text" class="settings-input" id="reg-name" placeholder="请输入姓名">
          </div>
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
      const name = document.getElementById('reg-name').value.trim();
      const color = container.querySelector('.color-dot.selected').dataset.color;

      if (!phone || !name) {
        Utils.toast('请填写完整的注册信息');
        return;
      }

      try {
        const user = await userService.register(phone, name, color);
        // 同步到 authService，确保全局一致
        authService.setCurrentUser(user);
        Utils.toast('注册成功！');
        Router.navigate('/join');
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