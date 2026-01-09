import { BaseRepository } from './base.repository';

export interface UserInvitation {
  id: number;
  email: string;
  organization_id: number;
  role: 'owner' | 'editor' | 'viewer';
  department_ids?: number[];
  token_hash: string;
  expires_at: Date;
  status: 'pending' | 'accepted' | 'expired';
  invited_by: number;
  accepted_at?: Date;
  created_at: Date;
  updated_at?: Date;
}

/**
 * UserInvitation Repository
 * Handles all database operations for user_invitations table
 */
export class UserInvitationRepository extends BaseRepository {
  protected get tableName(): string {
    return 'user_invitations';
  }

  /**
   * Find invitation by token hash
   */
  async findByToken(tokenHash: string): Promise<UserInvitation | undefined> {
    return this.db(this.tableName).where({ token_hash: tokenHash }).first();
  }

  /**
   * Find pending invitations by email
   */
  async findPendingByEmail(email: string): Promise<UserInvitation[]> {
    return this.db(this.tableName)
      .where({
        email: email.toLowerCase(),
        status: 'pending',
      })
      .andWhere('expires_at', '>', this.db.fn.now())
      .orderBy('created_at', 'desc');
  }

  /**
   * Expire old pending invitations
   * Returns number of expired invitations
   */
  async expireOldInvitations(): Promise<number> {
    const result = await this.db(this.tableName)
      .where({ status: 'pending' })
      .andWhere('expires_at', '<', this.db.fn.now())
      .update({
        status: 'expired',
        updated_at: this.db.fn.now(),
      });

    return result;
  }

  /**
   * Mark invitation as accepted
   */
  async markAsAccepted(id: number): Promise<UserInvitation> {
    const [result] = await this.db(this.tableName)
      .where({ id })
      .update({
        status: 'accepted',
        accepted_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      })
      .returning('*');

    return result;
  }

  /**
   * Find pending invitations by organization
   */
  async findPendingByOrganization(
    organizationId: number
  ): Promise<UserInvitation[]> {
    return this.db(this.tableName)
      .where({
        organization_id: organizationId,
        status: 'pending',
      })
      .andWhere('expires_at', '>', this.db.fn.now())
      .orderBy('created_at', 'desc');
  }
}
