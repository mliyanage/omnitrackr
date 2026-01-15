import { apiClient } from './client';

export interface UserInvitation {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  organization_id: number;
  role: 'owner' | 'editor' | 'viewer';
  department_ids?: number[] | string;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  invited_by: number;
  accepted_at?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Get all pending invitations for organization
 */
export async function getPendingInvitations(): Promise<UserInvitation[]> {
  const response = await apiClient.get('/users/invitations');
  return response.data.data;
}

/**
 * Resend invitation email
 */
export async function resendInvitation(invitationId: number): Promise<UserInvitation> {
  const response = await apiClient.post(`/users/invitations/${invitationId}/resend`);
  return response.data.data;
}

/**
 * Delete/cancel invitation
 */
export async function deleteInvitation(invitationId: number): Promise<void> {
  await apiClient.delete(`/users/invitations/${invitationId}`);
}

/**
 * Get invitation details by token
 */
export async function getInvitationByToken(token: string): Promise<Partial<UserInvitation>> {
  const response = await apiClient.get(`/users/invitation/${token}`);
  return response.data.data;
}
