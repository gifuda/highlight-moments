/* ============================================
   应用入口
   初始化存储、注册路由、启动应用
   ============================================ */

(async function initApp() {
  try {
    // 1. 初始化数据存储
    await Store.init();

    // 2. 加载当前用户
    userService.loadCurrentUser();

    // 3. 加载认证用户
    authService.loadCurrentUser();

    // 4. 初始化云盘模块
    initCloudModules();

    // 5. 注册页面路由
    Router.on('/', () => Timeline.render());
    Router.on('/new', () => Editor.render());
    Router.on('/edit', (id) => Editor.render(id));
    Router.on('/settings', () => Settings.render());
    Router.on('/register', () => Register.render());
    Router.on('/login', () => Login.render());
    Router.on('/join', () => Join.render());

    // 6. 启动路由（根据当前 URL hash 渲染页面）
    Router.init();

    // 7. 底部导航栏点击事件（拦截需登录的页面）
    document.querySelectorAll('.nav-item[data-route]').forEach(btn => {
      btn.addEventListener('click', () => {
        const route = btn.dataset.route;
        // 未登录时，只允许访问首页（引导页）
        if (!authService.getCurrentUser() && route !== '/') {
          Router.navigate('/login');
          return;
        }
        Router.navigate(route);
      });
    });

    // 8. 设置按钮
    document.getElementById('btn-settings').addEventListener('click', () => {
      if (!authService.getCurrentUser()) {
        Router.navigate('/login');
        return;
      }
      Router.navigate('/settings');
    });

    // 9. 注册 Service Worker（PWA 离线支持）
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    console.log('高光时刻 已启动');
  } catch (err) {
    console.error('应用初始化失败:', err);
    document.getElementById('app-container').innerHTML = `
      <div class="page" style="text-align:center; padding-top:80px;">
        <h2>启动失败</h2>
        <p style="color:var(--text-secondary); margin-top:8px;">${err.message}</p>
      </div>
    `;
  }
})();

/* 云盘模块初始化 */
async function initCloudModules() {
  try {
    // 注册云盘提供商
    authService.registerProvider('webdav', WebDAVProvider);

    // 加载当前用户
    const user = authService.loadCurrentUser();
    if (user) {
      // 尝试初始化云盘同步
      await syncManager.init();
      if (syncManager.isConfigured()) {
        // 启动自动同步（30 秒轮询）
        syncManager.startAutoSync();
      }
    }
  } catch (err) {
    console.error('云盘模块初始化失败:', err);
  }
}
