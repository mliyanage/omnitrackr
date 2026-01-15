import Mailjet from 'node-mailjet';

/**
 * Email Service
 * Handles all transactional emails via Mailjet REST API
 */
export class EmailService {
  private mailjet: any = null;
  private fromEmail: string;
  private fromName: string;
  private appUrl: string;
  private apiKey: string | undefined;
  private apiSecret: string | undefined;

  constructor() {
    // Store credentials but don't initialize Mailjet yet
    this.apiKey = process.env.MJ_APIKEY_PUBLIC || process.env.SMTP_USER;
    this.apiSecret = process.env.MJ_APIKEY_PRIVATE || process.env.SMTP_PASSWORD;
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@omnitrackr.com';
    this.fromName = process.env.FROM_NAME || 'OmniTrackr';
    this.appUrl = process.env.APP_URL || 'http://localhost:5173';

    // Debug logging (only in development)
    if (process.env.NODE_ENV !== 'production') {
      console.log('EmailService initialized:');
      console.log('  Mailjet configured:', this.apiKey && this.apiSecret ? 'YES' : 'NO');
      console.log('  FROM_EMAIL:', this.fromEmail);
      console.log('  FROM_NAME:', this.fromName);
    }

    if (!this.apiKey || !this.apiSecret) {
      console.warn(
        '⚠️  Email service not configured. Alerts will not be sent via email.'
      );
      console.warn('   Set MJ_APIKEY_PUBLIC and MJ_APIKEY_PRIVATE environment variables to enable email alerts.');
    }
  }

  /**
   * Lazy-load Mailjet client
   */
  private getMailjetClient(): any {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error(
        'Email service not configured. Set MJ_APIKEY_PUBLIC and MJ_APIKEY_PRIVATE environment variables.'
      );
    }

    if (!this.mailjet) {
      this.mailjet = new Mailjet({
        apiKey: this.apiKey,
        apiSecret: this.apiSecret,
      });
    }

    return this.mailjet;
  }

  /**
   * Send email verification link
   */
  async sendVerificationEmail(
    email: string,
    token: string,
    firstName: string
  ): Promise<void> {
    const verificationUrl = `${this.appUrl}/verify-email?token=${token}`;

    const html = this.generateEmailTemplate({
      title: 'Verify Your Email',
      greeting: `Hi ${firstName},`,
      content: `
        <p>Thank you for signing up for OmniTrackr!</p>
        <p>Please click the button below to verify your email address and activate your account:</p>
      `,
      buttonText: 'Verify Email',
      buttonUrl: verificationUrl,
      footer: `
        <p>If you didn't create an account, you can safely ignore this email.</p>
        <p>This link will expire in 24 hours.</p>
      `,
    });

    await this.sendEmail({
      to: email,
      subject: 'Verify Your Email - OmniTrackr',
      html,
    });

    console.log(`Verification email sent to ${email}`);
  }

  /**
   * Send password reset link
   */
  async sendPasswordResetEmail(
    email: string,
    token: string,
    firstName: string
  ): Promise<void> {
    const resetUrl = `${this.appUrl}/reset-password?token=${token}`;

    const html = this.generateEmailTemplate({
      title: 'Reset Your Password',
      greeting: `Hi ${firstName},`,
      content: `
        <p>We received a request to reset your password for your OmniTrackr account.</p>
        <p>Click the button below to reset your password:</p>
      `,
      buttonText: 'Reset Password',
      buttonUrl: resetUrl,
      footer: `
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
        <p>This link will expire in 24 hours.</p>
      `,
    });

    await this.sendEmail({
      to: email,
      subject: 'Reset Your Password - OmniTrackr',
      html,
    });

    console.log(`Password reset email sent to ${email}`);
  }

  /**
   * Send user invitation email
   */
  async sendInvitationEmail(
    email: string,
    token: string,
    organizationName: string,
    inviterName: string,
    inviteeFirstName?: string
  ): Promise<void> {
    const inviteUrl = `${this.appUrl}/accept-invitation?token=${token}`;
    const greeting = inviteeFirstName ? `Hi ${inviteeFirstName},` : 'Hi there,';

    const html = this.generateEmailTemplate({
      title: 'You\'re Invited!',
      greeting,
      content: `
        <p>${inviterName} has invited you to join <strong>${organizationName}</strong> on OmniTrackr.</p>
        <p>Click the button below to accept your invitation and set up your account:</p>
      `,
      buttonText: 'Accept Invitation',
      buttonUrl: inviteUrl,
      footer: `
        <p>If you don't recognize this invitation, you can safely ignore this email.</p>
        <p>This invitation will expire in 7 days.</p>
      `,
    });

    await this.sendEmail({
      to: email,
      subject: `You've been invited to ${organizationName} - OmniTrackr`,
      html,
    });

    console.log(`Invitation email sent to ${email}`);
  }

  /**
   * Send welcome email after email verification
   */
  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    const dashboardUrl = `${this.appUrl}/dashboard`;

    const html = this.generateEmailTemplate({
      title: 'Welcome to OmniTrackr!',
      greeting: `Hi ${firstName},`,
      content: `
        <p>Your email has been verified successfully!</p>
        <p>You're all set to start tracking and managing your files with OmniTrackr.</p>
        <p>Click the button below to access your dashboard:</p>
      `,
      buttonText: 'Go to Dashboard',
      buttonUrl: dashboardUrl,
      footer: `
        <p>If you have any questions, feel free to reach out to our support team.</p>
      `,
    });

    await this.sendEmail({
      to: email,
      subject: 'Welcome to OmniTrackr!',
      html,
    });

    console.log(`Welcome email sent to ${email}`);
  }

  /**
   * Send password changed notification
   */
  async sendPasswordChangedEmail(
    email: string,
    firstName: string
  ): Promise<void> {
    const supportUrl = `${this.appUrl}/support`;

    const html = this.generateEmailTemplate({
      title: 'Password Changed',
      greeting: `Hi ${firstName},`,
      content: `
        <p>This is a confirmation that your password was successfully changed.</p>
        <p>If you didn't make this change, please contact our support team immediately.</p>
      `,
      buttonText: 'Contact Support',
      buttonUrl: supportUrl,
      footer: `
        <p>For security reasons, you've been logged out of all devices. Please log in again with your new password.</p>
      `,
    });

    await this.sendEmail({
      to: email,
      subject: 'Password Changed - OmniTrackr',
      html,
    });

    console.log(`Password changed notification sent to ${email}`);
  }

  /**
   * Send 2FA enabled notification
   */
  async send2FAEnabledEmail(email: string, firstName: string): Promise<void> {
    const settingsUrl = `${this.appUrl}/settings/security`;

    const html = this.generateEmailTemplate({
      title: 'Two-Factor Authentication Enabled',
      greeting: `Hi ${firstName},`,
      content: `
        <p>Two-factor authentication has been successfully enabled on your account.</p>
        <p>Your account is now more secure. You'll need to enter a verification code from your authenticator app when you log in.</p>
      `,
      buttonText: 'View Security Settings',
      buttonUrl: settingsUrl,
      footer: `
        <p>If you didn't enable 2FA, please secure your account immediately by changing your password.</p>
      `,
    });

    await this.sendEmail({
      to: email,
      subject: '2FA Enabled - OmniTrackr',
      html,
    });

    console.log(`2FA enabled notification sent to ${email}`);
  }

  /**
   * Send SLA breach alert email
   */
  async sendSLABreachAlert(options: {
    to: string;
    cc?: string[];
    bcc?: string[];
    alert: {
      type: string; // 'sla_breached' | 'sla_at_risk' | 'file_arrived'
      watcherName: string;
      expectedPattern: string;
      expectedAt: Date;
      slaDeadline: Date;
      departmentCode?: string;
      message: string;
      escalationLevel?: number;
    };
  }): Promise<void> {
    const { alert } = options;

    const alertTypeLabels: Record<string, string> = {
      sla_breached: 'SLA BREACH',
      sla_at_risk: 'SLA AT RISK',
      file_arrived: 'FILE ARRIVED',
    };

    const alertTypeColors: Record<string, string> = {
      sla_breached: '#dc2626', // Red
      sla_at_risk: '#f59e0b', // Orange
      file_arrived: '#10b981', // Green
    };

    const alertLabel = alertTypeLabels[alert.type] || alert.type.toUpperCase();
    const alertColor = alertTypeColors[alert.type] || '#667eea';
    const escalationNote = alert.escalationLevel && alert.escalationLevel > 0
      ? `<p style="background-color: #fee2e2; padding: 12px; border-left: 4px solid ${alertColor}; margin: 20px 0;"><strong>⚠️ Escalation Level ${alert.escalationLevel}</strong> - This alert has been escalated due to no acknowledgment.</p>`
      : '';

    const subject = alert.escalationLevel && alert.escalationLevel > 0
      ? `[${alertLabel} - ESCALATED LEVEL ${alert.escalationLevel}] ${alert.watcherName}`
      : `[${alertLabel}] ${alert.watcherName}`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${alertLabel}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); overflow: hidden; }
    .header { background: ${alertColor}; padding: 30px 20px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
    .content { padding: 40px 30px; }
    .alert-details { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0; }
    .alert-details p { margin: 10px 0; color: #374151; }
    .alert-details strong { color: #1f2937; display: inline-block; min-width: 160px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 14px; color: #777; }
    .button { display: inline-block; padding: 14px 32px; background: ${alertColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
    .copyright { text-align: center; padding: 20px; background-color: #f9f9f9; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 32px; font-weight: 700; margin-bottom: 5px;">OmniTrackr</div>
      <h1>${alertLabel}</h1>
    </div>
    <div class="content">
      ${escalationNote}
      <h2 style="color: #1f2937; margin-bottom: 20px;">Alert Notification</h2>
      <div class="alert-details">
        <p><strong>Watcher:</strong> ${alert.watcherName}</p>
        ${alert.departmentCode ? `<p><strong>Department:</strong> ${alert.departmentCode}</p>` : ''}
        <p><strong>Expected Pattern:</strong> ${alert.expectedPattern}</p>
        <p><strong>Expected At:</strong> ${new Date(alert.expectedAt).toLocaleString()}</p>
        <p><strong>SLA Deadline:</strong> ${new Date(alert.slaDeadline).toLocaleString()}</p>
      </div>
      <div style="background-color: #fef3c7; border-left: 4px solid ${alertColor}; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #92400e;"><strong>Message:</strong> ${alert.message}</p>
      </div>
      <div style="text-align: center;">
        <a href="${this.appUrl}/alerts" class="button">View Alert Details</a>
      </div>
      <div class="footer">
        <p>This is an automated alert from OmniTrackr SLA monitoring system.</p>
        <p>Please acknowledge this alert in the system once addressed.</p>
      </div>
    </div>
    <div class="copyright">
      &copy; ${new Date().getFullYear()} OmniTrackr. All rights reserved.
    </div>
  </div>
</body>
</html>
    `.trim();

    await this.sendEmailWithRecipients({
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject,
      html,
    });

    console.log(`SLA breach alert sent to ${options.to}`);
  }

  /**
   * Send email with multiple recipients (CC, BCC support)
   */
  private async sendEmailWithRecipients(options: {
    to: string;
    cc?: string[];
    bcc?: string[];
    subject: string;
    html: string;
  }): Promise<void> {
    const maxRetries = 3;
    const baseDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Email send attempt ${attempt}/${maxRetries} to ${options.to}`);

        const message: any = {
          From: {
            Email: this.fromEmail,
            Name: this.fromName,
          },
          To: [{ Email: options.to }],
          Subject: options.subject,
          HTMLPart: options.html,
          TextPart: this.stripHtml(options.html),
        };

        // Add CC if provided
        if (options.cc && options.cc.length > 0) {
          message.Cc = options.cc.map(email => ({ Email: email }));
        }

        // Add BCC if provided
        if (options.bcc && options.bcc.length > 0) {
          message.Bcc = options.bcc.map(email => ({ Email: email }));
        }

        const request = this.getMailjetClient()
          .post('send', { version: 'v3.1' })
          .request({
            Messages: [message],
          });

        const result = await request;

        if (result.response.status !== 200) {
          console.error('Mailjet API error:', result.body);
          throw new Error(`Mailjet API returned status ${result.response.status}`);
        }

        console.log(`Email sent successfully via Mailjet API (attempt ${attempt})`);
        return;
      } catch (error: any) {
        const isLastAttempt = attempt === maxRetries;
        const isRetryable =
          error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ENOTFOUND' ||
          error.code === 'EAI_AGAIN' ||
          (error.statusCode >= 500 && error.statusCode < 600);

        console.error(`Failed to send email (attempt ${attempt}/${maxRetries}):`, {
          code: error.code,
          message: error.message,
          statusCode: error.statusCode,
          isRetryable,
        });

        if (isLastAttempt || !isRetryable) {
          throw new Error(
            `Failed to send email: ${error.code} - ${error.message}`
          );
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Send generic email using Mailjet REST API with retry logic
   */
  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Email send attempt ${attempt}/${maxRetries} to ${options.to}`);

        const request = this.getMailjetClient()
          .post('send', { version: 'v3.1' })
          .request({
            Messages: [
              {
                From: {
                  Email: this.fromEmail,
                  Name: this.fromName,
                },
                To: [
                  {
                    Email: options.to,
                  },
                ],
                Subject: options.subject,
                HTMLPart: options.html,
                TextPart: options.text || this.stripHtml(options.html),
              },
            ],
          });

        const result = await request;

        if (result.response.status !== 200) {
          console.error('Mailjet API error:', result.body);
          throw new Error(`Mailjet API returned status ${result.response.status}`);
        }

        console.log(`Email sent successfully via Mailjet API (attempt ${attempt})`);
        return; // Success - exit the function
      } catch (error: any) {
        const isLastAttempt = attempt === maxRetries;
        const isRetryable =
          error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ENOTFOUND' ||
          error.code === 'EAI_AGAIN' ||
          (error.statusCode >= 500 && error.statusCode < 600);

        console.error(`Failed to send email (attempt ${attempt}/${maxRetries}):`, {
          code: error.code,
          message: error.message,
          statusCode: error.statusCode,
          isRetryable,
        });

        // Log detailed error information
        if (error.statusCode) {
          console.error('Mailjet error status:', error.statusCode);
          console.error('Mailjet error response:', error.response?.text || error.message);
        }

        // If this is the last attempt or error is not retryable, throw
        if (isLastAttempt || !isRetryable) {
          throw new Error(
            `Failed to send email: Unsuccessful: Error Code: "${error.code}" Message: "${error.message}"`
          );
        }

        // Wait before retrying (exponential backoff)
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Strip HTML tags for plain text fallback
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generate HTML email template
   */
  private generateEmailTemplate(options: {
    title: string;
    greeting: string;
    content: string;
    buttonText: string;
    buttonUrl: string;
    footer: string;
  }): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 500;
      margin-bottom: 20px;
      color: #333;
    }
    .content p {
      margin: 0 0 15px 0;
      color: #555;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      font-size: 16px;
      transition: transform 0.2s;
    }
    .button:hover {
      transform: translateY(-2px);
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 14px;
      color: #777;
    }
    .footer p {
      margin: 10px 0;
    }
    .logo {
      font-size: 32px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 5px;
    }
    .copyright {
      text-align: center;
      padding: 20px;
      background-color: #f9f9f9;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">OmniTrackr</div>
      <h1>${options.title}</h1>
    </div>
    <div class="content">
      <div class="greeting">${options.greeting}</div>
      ${options.content}
      <div class="button-container">
        <a href="${options.buttonUrl}" class="button">${options.buttonText}</a>
      </div>
      <div class="footer">
        ${options.footer}
      </div>
    </div>
    <div class="copyright">
      &copy; ${new Date().getFullYear()} OmniTrackr. All rights reserved.
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Verify email configuration
   */
  async verifyConnection(): Promise<boolean> {
    try {
      // Test connection by making a simple API call
      const request = this.getMailjetClient()
        .get('sender', { version: 'v3' })
        .request();

      await request;
      console.log('Mailjet API connection verified');
      return true;
    } catch (error) {
      console.error('Mailjet API connection failed:', error);
      return false;
    }
  }
}
