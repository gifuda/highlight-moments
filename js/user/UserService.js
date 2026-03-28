/* ============================================
   用户服务
   管理用户注册和登录
   ============================================ */

class UserService {
  constructor() {
    this.currentUser = null;
  }

  /* 注册新用户 */
  async register(phone, name, color) {
    // 检查手机号是否已注册
    const users = Store.getUsers();
    if (users.find(u => u.phone === phone)) {
      throw new Error('该手机号已注册');
    }

    const user = {
      id: Utils.uuid(),
      phone,
      name,
      color,
      createdAt: new Date().toISOString(),
      cloudConfig: null
    };

    users.push(user);
    Store.saveUsers(users);
    this.setCurrentUser(user);
    return user;
  }

  /* 登录 */
  async login(phone) {
    const users = Store.getUsers();
    const user = users.find(u => u.phone === phone);
    if (!user) {
      throw new Error('用户不存在');
    }
    this.setCurrentUser(user);
    return user;
  }

  /* 设置当前用户 */
  setCurrentUser(user) {
    this.currentUser = user;
    localStorage.setItem('hl_user_current_user', JSON.stringify(user));
  }

  /* 获取当前用户 */
  getCurrentUser() {
    return this.currentUser;
  }

  /* 加载当前用户 */
  loadCurrentUser() {
    try {
      const user = JSON.parse(localStorage.getItem('hl_user_current_user'));
      this.currentUser = user;
      return user;
    } catch {
      return null;
    }
  }

  /* 清除当前用户 */
  clearCurrentUser() {
    this.currentUser = null;
    localStorage.removeItem('hl_user_current_user');
  }

  /* 获取所有用户 */
  getAllUsers() {
    return [...this.users];
  }

  /* 更新用户云盘配置 */
  updateUserCloudConfig(cloudConfig) {
    if (!this.currentUser) return false;
    this.currentUser.cloudConfig = cloudConfig;
    // 保存到本地存储
    const users = Store.getUsers().map(u =>
      u.id === this.currentUser.id ? this.currentUser : u
    );
    Store.saveUsers(users);
    return true;
  }
}

// 全局单例
const userService = new UserService();