import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import { AlertComment, AlertCommentWithUser } from '../types';

/**
 * Alert Comment Repository
 * Handles all database operations for alert_comments table
 */
export class AlertCommentRepository extends BaseRepository {
  protected get tableName(): string {
    return 'alert_comments';
  }

  /**
   * Find comments by alert history ID
   */
  async findByAlertHistoryId(
    alertHistoryId: number
  ): Promise<AlertCommentWithUser[]> {
    const comments = await this.db(this.tableName)
      .select(
        `${this.tableName}.*`,
        'users.first_name',
        'users.last_name',
        'users.email'
      )
      .leftJoin('users', `${this.tableName}.user_id`, 'users.id')
      .where(`${this.tableName}.alert_history_id`, alertHistoryId)
      .whereNull(`${this.tableName}.deleted_at`)
      .orderBy(`${this.tableName}.created_at`, 'desc');

    return comments.map((comment: any) => ({
      ...comment,
      user: {
        id: comment.user_id,
        first_name: comment.first_name,
        last_name: comment.last_name,
        email: comment.email,
      },
    }));
  }

  /**
   * Soft delete comment
   */
  async softDelete(id: number): Promise<void> {
    await this.db(this.tableName).where({ id }).update({
      deleted_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });
  }

  /**
   * Create comment
   */
  async createComment(data: {
    alert_history_id: number;
    user_id: number;
    comment: string;
  }): Promise<AlertComment> {
    return this.create<AlertComment>(data);
  }
}
