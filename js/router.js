/* ============================================
   路由器
   基于 URL hash 的页面切换（#/new, #/settings 等）
   ============================================ */

const Router = {
  routes: {},       // 路由表：{ '/': renderFn, '/new': renderFn }
  currentRoute: '/',

  /* 注册路由 */
  on(path, renderFn) {
    this.routes[path] = renderFn;
  },

  /* 启动路由监听 */
  init() {
    window.addEventListener('hashchange', () => this._handleRoute());
    // 首次加载也触发
    this._handleRoute();
  },

  /* 导航到指定路由 */
  navigate(path) {
    window.location.hash = path;
  },

  /* 处理当前 hash */
  _handleRoute() {
    const hash = window.location.hash.slice(1) || '/';

    // 精确匹配
    if (this.routes[hash]) {
      this.currentRoute = hash;
      this.routes[hash]();
      this._updateNav(hash);
      return;
    }

    // 带参数匹配：/edit/xxx
    const editMatch = hash.match(/^\/edit\/(.+)$/);
    if (editMatch && this.routes['/edit']) {
      this.currentRoute = hash;
      this.routes['/edit'](editMatch[1]);
      this._updateNav('/edit');
      return;
    }

    // 带参数匹配：/register
    if (hash === '/register' && this.routes['/register']) {
      this.currentRoute = hash;
      this.routes['/register']();
      this._updateNav('/register');
      return;
    }

    // 带参数匹配：/login
    if (hash === '/login' && this.routes['/login']) {
      this.currentRoute = hash;
      this.routes['/login']();
      this._updateNav('/login');
      return;
    }

    // 带参数匹配：/join
    if (hash === '/join' && this.routes['/join']) {
      this.currentRoute = hash;
      this.routes['/join']();
      this._updateNav('/join');
      return;
    }

    // 未匹配 → 回到首页
    this.navigate('/');
  },

  /* 更新底部导航栏的高亮状态 */
  _updateNav(route) {
    document.querySelectorAll('.nav-item').forEach(btn => {
      const btnRoute = btn.getAttribute('data-route');
      btn.classList.toggle('active', btnRoute === route);
    });
  }
};
