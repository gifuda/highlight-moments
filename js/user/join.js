/* ============================================
   加入空间页面
   输入邀请码 → 加入对方的共享空间
   ============================================ */

const Join = {
  render() {
    const container = document.getElementById('app-container');
    const user = authService.getCurrentUser();

    if (!user) {
      Router.navigate('/register');
      return;
    }

    container.innerHTML = `
      <div class="page">
        <h2 style="font-size:22px; font-weight:600; margin-bottom:20px;">加入空间</h2>

        <div class="settings-section">
          <h3>邀请码</h3>
          <p style="font-size:13px; color:var(--text-secondary); margin-bottom:10px;">
            向空间创建者索取邀请码，粘贴后即可加入共享空间。
          </p>
          <div class="settings-row">
            <input type="text" class="settings-input" id="join-code" placeholder="粘贴邀请码">
          </div>
        </div>

        <button class="btn-primary" id="btn-join" style="width:100%; margin-top:10px;">加入空间</button>

        <div style="text-align:center; margin-top:20px;">
          <button class="btn-secondary" id="btn-create-space" style="padding:10px 20px;">或者创建自己的空间</button>
        </div>
      </div>
    `;

    // 加入空间
    container.querySelector('#btn-join').addEventListener('click', () => {
      const code = document.getElementById('join-code').value.trim();
      if (!code) {
        Utils.toast('请输入邀请码');
        return;
      }

      try {
        const space = invitationService.joinSpace(code, user.id);
        Utils.toast(`已加入空间「${space.name}」！`);
        Router.navigate('/');
      } catch (err) {
        Utils.toast(err.message);
      }
    });

    // 创建自己的空间
    container.querySelector('#btn-create-space').addEventListener('click', () => {
      const spaceName = prompt('请输入空间名称：');
      if (!spaceName) return;

      try {
        invitationService.createSpace(spaceName, user.id);

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
        Router.navigate('/settings');
      } catch (err) {
        Utils.toast('创建失败: ' + err.message);
      }
    });
  }
};
