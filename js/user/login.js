/* ============================================
   用户登录页面
   实现手机号登录
   ============================================ */

const Login = {
  render() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
      <div class="page">
        <h2 style="font-size:22px; font-weight:600; margin-bottom:20px;">用户登录</h2>

        <div class="settings-section">
          <h3>手机号</h3>
          <div class="settings-row">
            <input type="tel" class="settings-input" id="login-phone" placeholder="请输入手机号" maxlength="11">
          </div>
        </div>

        <button class="btn-primary" id="btn-login" style="width:100%; margin-top:20px;">登录</button>
        <div style="text-align:center; margin-top:20px;">
          <button class="btn-secondary" id="btn-register" style="padding:10px 20px;">没有账号？注册</button>
        </div>
      </div>
    `;

    // 登录按钮
    container.querySelector('#btn-login').addEventListener('click', async () => {
      const phone = document.getElementById('login-phone').value.trim();

      if (!phone) {
        Utils.toast('请输入手机号');
        return;
      }

      try {
        const user = await userService.login(phone);
        // 同步到 authService
        authService.setCurrentUser(user);
        Utils.toast('登录成功！');
        // 登录后判断是否有空间
        const spaces = invitationService.getUserSpaces(user.id);
        if (spaces.length === 0 && !Store.getConfig()) {
          Router.navigate('/join');
        } else {
          Router.navigate('/');
        }
      } catch (err) {
        Utils.toast('登录失败: ' + err.message);
      }
    });

    // 注册按钮
    container.querySelector('#btn-register').addEventListener('click', () => {
      Router.navigate('/register');
    });
  }
};