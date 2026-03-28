/* ============================================
   认证服务
   管理用户认证和云盘凭证
   ============================================ */

class AuthService {
  constructor() {
    this.currentUser = null;
    this.cloudProviders = {};
  }

  /* 注册云盘提供商 */
  registerProvider(name, providerClass) {
    this.cloudProviders[name] = providerClass;
  }

  /* 获取当前用户 */
  getCurrentUser() {
    return this.currentUser;
  }

  /* 设置当前用户 */
  setCurrentUser(user) {
    this.currentUser = user;
    localStorage.setItem('hl_auth_current_user', JSON.stringify(user));
  }

  /* 获取当前云盘配置 */
  getCurrentCloudConfig() {
    const user = this.getCurrentUser();
    return user?.cloudConfig || null;
  }

  /* 获取云盘提供商实例 */
  getCloudProvider() {
    const config = this.getCurrentCloudConfig();
    if (!config) return null;
    const ProviderClass = this.cloudProviders[config.provider];
    if (!ProviderClass) return null;
    return new ProviderClass(config);
  }

  /* 加载当前用户 */
  loadCurrentUser() {
    try {
      const user = JSON.parse(localStorage.getItem('hl_auth_current_user'));
      this.currentUser = user;
      return user;
    } catch {
      return null;
    }
  }

  /* 清除当前用户 */
  clearCurrentUser() {
    this.currentUser = null;
    localStorage.removeItem('hl_auth_current_user');
  }

  /* 生成加密凭证（简化版，实际需要更安全的加密） */
  encryptCredentials(credentials) {
    // 简化版：使用 Base64 编码（实际应用需要更安全的加密）
    return btoa(JSON.stringify(credentials));
  }

  /* 解密凭证 */
  decryptCredentials(encrypted) {
    try {
      return JSON.parse(atob(encrypted));
    } catch {
      return null;
    }
  }
}

// 全局单例
const authService = new AuthService();