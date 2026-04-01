/* ============================================
   邀请服务
   管理空间邀请和成员审核

   邀请码格式：自包含，编码了 spaceId + spaceName
   其他设备无需查数据库即可解析加入
   ============================================ */

class InvitationService {
  constructor() {
    this.spaces = [];
  }

  /* 生成自包含邀请码（把空间信息编码进去，跨设备可用） */
  generateInviteCode(spaceId, spaceName) {
    const payload = JSON.stringify({ s: spaceId, n: spaceName });
    // 用 base64 编码，去掉可能的 = 填充
    return btoa(unescape(encodeURIComponent(payload)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  /* 解析邀请码，返回 { spaceId, spaceName } 或 null */
  parseInviteCode(code) {
    try {
      // 还原 base64 标准字符
      let normalized = code.replace(/-/g, '+').replace(/_/g, '/');
      // 补齐 base64 填充
      while (normalized.length % 4 !== 0) normalized += '=';
      const json = decodeURIComponent(escape(atob(normalized)));
      const data = JSON.parse(json);
      if (!data.s || !data.n) return null;
      return { spaceId: data.s, spaceName: data.n };
    } catch {
      return null;
    }
  }

  /* 使用邀请码加入空间（自包含，不需要查数据库） */
  joinSpace(code, userId) {
    const info = this.parseInviteCode(code);
    if (!info) {
      throw new Error('无效的邀请码');
    }

    // 本地创建或查找空间
    let space = Store.getSpace(info.spaceId);
    if (!space) {
      // 在本地创建这个空间的记录
      space = {
        id: info.spaceId,
        name: info.spaceName,
        creatorId: null, // 被邀请者不知道创建者 ID
        members: [],
        createdAt: new Date().toISOString(),
        cloudConfig: null
      };
      const spaces = Store.getSpaces();
      spaces.push(space);
      Store.saveSpaces(spaces);
    }

    // 添加自己为成员
    if (!space.members.includes(userId)) {
      this.addMember(space.id, userId);
    }

    // 设置 config
    if (!Store.getConfig()) {
      Store.saveConfig({
        version: '1.0.0',
        spaceName: info.spaceName,
        authors: [],
        currentAuthor: userId,
        createdAt: new Date().toISOString()
      });
    }

    return space;
  }

  /* 创建空间 */
  createSpace(name, creatorId) {
    const space = {
      id: Utils.uuid(),
      name,
      creatorId,
      members: [creatorId],
      createdAt: new Date().toISOString(),
      cloudConfig: null
    };
    const spaces = Store.getSpaces();
    spaces.push(space);
    Store.saveSpaces(spaces);
    return space;
  }

  /* 添加成员到空间 */
  addMember(spaceId, memberId) {
    const spaces = Store.getSpaces();
    const space = spaces.find(s => s.id === spaceId);
    if (!space) return false;
    if (space.members.includes(memberId)) return false;
    space.members.push(memberId);
    Store.saveSpaces(spaces);
    return true;
  }

  /* 获取空间成员 */
  getSpaceMembers(spaceId) {
    const spaces = Store.getSpaces();
    const space = spaces.find(s => s.id === spaceId);
    return space?.members || [];
  }

  /* 检查名字在空间内是否唯一 */
  isNameUniqueInSpace(spaceId, name) {
    const memberIds = this.getSpaceMembers(spaceId);
    const users = Store.getUsers();
    return !users.some(u => memberIds.includes(u.id) && u.name === name);
  }

  /* 获取用户的空间 */
  getUserSpaces(userId) {
    const spaces = Store.getSpaces();
    return spaces.filter(s => s.members.includes(userId));
  }
}

// 全局单例
const invitationService = new InvitationService();
