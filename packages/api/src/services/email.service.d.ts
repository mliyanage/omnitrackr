/**
 * Email Service
 * Handles all transactional emails via Mailjet REST API
 */
export declare class EmailService {
    private mailjet;
    private fromEmail;
    private fromName;
    private appUrl;
    private apiKey;
    private apiSecret;
    constructor();
    /**
     * Lazy-load Mailjet client
     */
    private getMailjetClient;
    /**
     * Send email verification link
     */
    sendVerificationEmail(email: string, token: string, firstName: string): Promise<void>;
    /**
     * Send password reset link
     */
    sendPasswordResetEmail(email: string, token: string, firstName: string): Promise<void>;
    /**
     * Send user invitation email
     */
    sendInvitationEmail(email: string, token: string, organizationName: string, inviterName: string, inviteeFirstName?: string): Promise<void>;
    /**
     * Send welcome email after email verification
     */
    sendWelcomeEmail(email: string, firstName: string): Promise<void>;
    /**
     * Send password changed notification
     */
    sendPasswordChangedEmail(email: string, firstName: string): Promise<void>;
    /**
     * Send 2FA enabled notification
     */
    send2FAEnabledEmail(email: string, firstName: string): Promise<void>;
    /**
     * Send SLA breach alert email
     */
    sendSLABreachAlert(options: {
        to: string;
        cc?: string[];
        bcc?: string[];
        alert: {
            type: string;
            watcherName: string;
            expectedPattern: string;
            expectedAt: Date;
            slaDeadline: Date;
            departmentCode?: string;
            message: string;
            escalationLevel?: number;
        };
    }): Promise<void>;
    /**
     * Send email with multiple recipients (CC, BCC support)
     */
    private sendEmailWithRecipients;
    /**
     * Send generic email using Mailjet REST API with retry logic
     */
    private sendEmail;
    /**
     * Strip HTML tags for plain text fallback
     */
    private stripHtml;
    /**
     * Generate HTML email template
     */
    private generateEmailTemplate;
    /**
     * Verify email configuration
     */
    verifyConnection(): Promise<boolean>;
}
//# sourceMappingURL=email.service.d.ts.map