/* ============================================
   邀请服务
   管理空间邀请和成员审核
   ============================================ */

class InvitationService {
  constructor() {
    this.invitations = [];
    this.spaces = [];
  }

  /* 创建邀请码 */
  createInvitation(spaceId, creatorId, maxUses = 1) {
    const invitation = {
      id: Utils.uuid(),
      spaceId,
      creatorId,
      code: this._generateInvitationCode(),
      maxUses,
      currentUses: 0,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7天后过期
      status: 'active'
    };

    const invitations = Store.getInvitations();
    invitations.push(invitation);
    Store.saveInvitations(invitations);
    return invitation;
  }

  /* 生成邀请码 */
  _generateInvitationCode() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  /* 使用邀请码 */
  useInvitation(code) {
    const invitations = Store.getInvitations();
    const invitationIndex = invitations.findIndex(i =>
      i.code === code &&
      i.status === 'active' &&
      i.currentUses < i.maxUses &&
      new Date(i.expiresAt) > new Date()
    );

    if (invitationIndex === -1) {
      throw new Error('无效的邀请码或已过期');
    }

    const invitation = invitations[invitationIndex];
    invitation.currentUses++;
    if (invitation.currentUses >= invitation.maxUses) {
      invitation.status = 'used';
    }

    Store.saveInvitations(invitations);
    return invitation;
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

  /* 获取用户的空间 */
  getUserSpaces(userId) {
    const spaces = Store.getSpaces();
    return spaces.filter(s => s.members.includes(userId));
  }

  /* 获取邀请码 */
  getInvitation(code) {
    return Store.getInvitation(code);
  }

  /* 获取空间的所有邀请码 */
  getSpaceInvitations(spaceId) {
    return Store.getInvitations().filter(i => i.spaceId === spaceId && i.status === 'active');
  }

  /* 获取用户创建的邀请码 */
  getUserInvitations(userId) {
    return Store.getInvitations().filter(i => i.creatorId === userId);
  }

  /* 获取所有邀请码 */
  getAllInvitations() {
    return Store.getInvitations();
  }

  /* 清理过期的邀请码 */
  cleanupExpiredInvitations() {
    const now = new Date();
    const invitations = Store.getInvitations().filter(i => {
      const expires = new Date(i.expiresAt);
      return expires > now;
    });
    Store.saveInvitations(invitations);
  }
}

// 全局单例
const invitationService = new InvitationService();