import Mailjet from 'node-mailjet';

/**
 * Email Service
 * Handles all transactional emails via Mailjet REST API
 */
export class EmailService {
  private mailjet: any;
  private fromEmail: string;
  private fromName: string;
  private appUrl: string;

  constructor() {
    // Validate environment variables
    const apiKey = process.env.MJ_APIKEY_PUBLIC || process.env.SMTP_USER;
    const apiSecret = process.env.MJ_APIKEY_PRIVATE || process.env.SMTP_PASSWORD;
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@omnitrackr.com';
    this.fromName = process.env.FROM_NAME || 'OmniTrackr';
    this.appUrl = process.env.APP_URL || 'http://localhost:5173';

    // Debug logging
    console.log('EmailService initialization:');
    console.log('  MJ_APIKEY_PUBLIC:', process.env.MJ_APIKEY_PUBLIC ? `${process.env.MJ_APIKEY_PUBLIC.substring(0, 10)}...` : 'NOT SET');
    console.log('  MJ_APIKEY_PRIVATE:', process.env.MJ_APIKEY_PRIVATE ? `${process.env.MJ_APIKEY_PRIVATE.substring(0, 10)}...` : 'NOT SET');
    console.log('  SMTP_USER (fallback):', process.env.SMTP_USER ? `${process.env.SMTP_USER.substring(0, 10)}...` : 'NOT SET');
    console.log('  SMTP_PASSWORD (fallback):', process.env.SMTP_PASSWORD ? `${process.env.SMTP_PASSWORD.substring(0, 10)}...` : 'NOT SET');
    console.log('  Using API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING');
    console.log('  Using API Secret:', apiSecret ? `${apiSecret.substring(0, 10)}...` : 'MISSING');
    console.log('  FROM_EMAIL:', this.fromEmail);
    console.log('  FROM_NAME:', this.fromName);

    if (!apiKey || !apiSecret) {
      console.warn(
        'Email service not configured. Set MJ_APIKEY_PUBLIC and MJ_APIKEY_PRIVATE environment variables.'
      );
    }

    // Initialize Mailjet client
    this.mailjet = new Mailjet({
      apiKey: apiKey || '',
      apiSecret: apiSecret || '',
    });
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
    inviterName: string
  ): Promise<void> {
    const inviteUrl = `${this.appUrl}/accept-invitation?token=${token}`;

    const html = this.generateEmailTemplate({
      title: 'You\'re Invited!',
      greeting: `Hi there,`,
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

        const request = this.mailjet
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
      const request = this.mailjet
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
