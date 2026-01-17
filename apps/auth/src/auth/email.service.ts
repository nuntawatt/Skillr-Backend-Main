import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;
  private readonly isResendConfigured: boolean;
  private readonly smtpConfigured: boolean;
  private readonly transporter: nodemailer.Transporter | null;

  constructor(private readonly configService: ConfigService) {
    const resendKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail = this.configService.get<string>('MAIL_FROM') ?? 'no-reply@skillracademy.com';
    this.isResendConfigured = !!resendKey;
    this.resend = this.isResendConfigured ? new Resend(resendKey as string) : null;

    const smtpHost = this.configService.get<string>('EMAIL_HOST') ?? this.configService.get<string>('SMTP_HOST');
    const smtpPort = Number(this.configService.get<number>('EMAIL_PORT') ?? this.configService.get<number>('SMTP_PORT') ?? 587);
    const smtpUser = this.configService.get<string>('EMAIL_USER') ?? this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('EMAIL_PASS') ?? this.configService.get<string>('SMTP_PASS');

    this.smtpConfigured = !!(smtpHost && smtpUser && smtpPass);
    this.transporter = this.smtpConfigured
      ? nodemailer.createTransport({
          host: smtpHost as string,
          port: smtpPort,
          secure: smtpPort === 465, // true for 465, false for other ports
          auth: {
            user: smtpUser as string,
            pass: smtpPass as string,
          },
        })
      : null;

    this.logger.log(`EmailService initialized - Resend: ${this.isResendConfigured}, SMTP: ${this.smtpConfigured}, From: ${this.fromEmail}`);
  }

  async sendOtpEmail(to: string, otp: string): Promise<boolean> {
    const subject = 'รหัส OTP สำหรับรีเซ็ตรหัสผ่าน - Skillr Academy';
    const html = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f7fa; padding: 40px 0;">
          <tr>
            <td align="center">
              <!-- Container -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07); overflow: hidden;">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                      🎓 Skillr Academy
                    </h1>
                    <p style="margin: 8px 0 0 0; color: #e6e9ff; font-size: 14px; font-weight: 500;">
                      แพลตฟอร์มเรียนรู้ออนไลน์
                    </p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 50px 40px;">
                    <h2 style="margin: 0 0 16px 0; color: #1a202c; font-size: 24px; font-weight: 700;">
                      🔐 รีเซ็ตรหัสผ่าน
                    </h2>
                    <p style="margin: 0 0 30px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                      คุณได้ขอรีเซ็ตรหัสผ่านของบัญชี Skillr Academy กรุณาใช้รหัส OTP ด้านล่างเพื่อดำเนินการต่อ
                    </p>

                    <!-- OTP Box -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td align="center" style="padding: 30px 0;">
                          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 3px; display: inline-block;">
                            <div style="background-color: #ffffff; border-radius: 10px; padding: 24px 48px;">
                              <div style="color: #667eea; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                                รหัส OTP ของคุณ
                              </div>
                              <div style="font-size: 42px; font-weight: 800; color: #1a202c; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                                ${otp}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Warning Box -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px;">
                      <tr>
                        <td style="background-color: #fff5f5; border-left: 4px solid #fc8181; padding: 16px 20px; border-radius: 8px;">
                          <p style="margin: 0; color: #742a2a; font-size: 14px; line-height: 1.6;">
                            ⏱️ <strong>รหัสนี้จะหมดอายุภายใน 10 นาที</strong><br>
                            <span style="color: #c53030;">กรุณาอย่าแชร์รหัสนี้กับผู้อื่น</span>
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Info Text -->
                    <p style="margin: 30px 0 0 0; color: #718096; font-size: 14px; line-height: 1.6;">
                      หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้ หรือติดต่อทีมสนับสนุนของเราทันที
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f7fafc; padding: 30px 40px; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 12px 0; color: #718096; font-size: 13px; line-height: 1.6; text-align: center;">
                      ขอบคุณที่ใช้บริการ <strong style="color: #667eea;">Skillr Academy</strong>
                    </p>
                    <p style="margin: 0; color: #a0aec0; font-size: 12px; text-align: center;">
                      © ${new Date().getFullYear()} Skillr Academy. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    const text = `รหัส OTP: ${otp} (หมดอายุใน 10 นาที)`;
    return this.sendEmail(to, subject, html, text);
  }

  async sendPasswordChangedEmail(to: string): Promise<boolean> {
    const subject = 'รหัสผ่านของคุณถูกเปลี่ยนแล้ว - Skillr Academy';
    const html = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f7fa; padding: 40px 0;">
          <tr>
            <td align="center">
              <!-- Container -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07); overflow: hidden;">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                      🎓 Skillr Academy
                    </h1>
                    <p style="margin: 8px 0 0 0; color: #e6ffed; font-size: 14px; font-weight: 500;">
                      แพลตฟอร์มเรียนรู้ออนไลน์
                    </p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 50px 40px;">
                    <!-- Success Icon -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td align="center" style="padding-bottom: 30px;">
                          <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); width: 80px; height: 80px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 8px 16px rgba(72, 187, 120, 0.3);">
                            <span style="font-size: 48px; line-height: 1;">✓</span>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <h2 style="margin: 0 0 16px 0; color: #1a202c; font-size: 24px; font-weight: 700; text-align: center;">
                      รหัสผ่านถูกเปลี่ยนสำเร็จ
                    </h2>
                    
                    <p style="margin: 0 0 30px 0; color: #4a5568; font-size: 16px; line-height: 1.6; text-align: center;">
                      รหัสผ่านของคุณถูกเปลี่ยนเรียบร้อยแล้ว คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที
                    </p>

                    <!-- Info Box -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px;">
                      <tr>
                        <td style="background-color: #f0fff4; border-left: 4px solid #48bb78; padding: 20px; border-radius: 8px;">
                          <p style="margin: 0 0 12px 0; color: #22543d; font-size: 15px; font-weight: 600;">
                            🛡️ ความปลอดภัยของบัญชี
                          </p>
                          <p style="margin: 0; color: #276749; font-size: 14px; line-height: 1.6;">
                            เราแนะนำให้คุณ:<br>
                            • ใช้รหัสผ่านที่แข็งแกร่งและไม่ซ้ำกับเว็บไซต์อื่น<br>
                            • เปิดใช้งานการยืนยันตัวตนสองขั้นตอน (2FA) หากมี<br>
                            • ตรวจสอบกิจกรรมบัญชีของคุณเป็นประจำ
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Warning Box -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 24px;">
                      <tr>
                        <td style="background-color: #fffaf0; border-left: 4px solid #ed8936; padding: 16px 20px; border-radius: 8px;">
                          <p style="margin: 0; color: #7c2d12; font-size: 14px; line-height: 1.6;">
                            ⚠️ <strong>ไม่ได้เป็นคุณที่ทำการเปลี่ยน?</strong><br>
                            <span style="color: #c05621;">หากคุณไม่ได้ทำการเปลี่ยนรหัสผ่าน กรุณาติดต่อทีมสนับสนุนของเราทันที เพื่อรักษาความปลอดภัยของบัญชี</span>
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 40px;">
                      <tr>
                        <td align="center">
                          <a href="#" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                            เข้าสู่ระบบ Skillr Academy
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f7fafc; padding: 30px 40px; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 12px 0; color: #718096; font-size: 13px; line-height: 1.6; text-align: center;">
                      ต้องการความช่วยเหลือ? ติดต่อเราได้ที่ <a href="mailto:support@skillracademy.com" style="color: #667eea; text-decoration: none;">support@skillracademy.com</a>
                    </p>
                    <p style="margin: 0; color: #a0aec0; font-size: 12px; text-align: center;">
                      © ${new Date().getFullYear()} Skillr Academy. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    const text = 'รหัสผ่านของคุณถูกเปลี่ยนเรียบร้อยแล้ว';
    return this.sendEmail(to, subject, html, text);
  }

  private async sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
    // Priority: SMTP if configured -> Resend -> Preview
    if (this.smtpConfigured && this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: this.fromEmail,
          to,
          subject,
          text,
          html,
        });
        this.logger.log(`SMTP email sent to ${to}, messageId=${info.messageId}`);
        return true;
      } catch (err) {
        this.logger.error(`SMTP send failed to ${to}: ${(err as Error).message}`);
        // fallthrough to try Resend if available
      }
    }

    if (this.isResendConfigured && this.resend) {
      try {
        const result = await this.resend.emails.send({
          from: this.fromEmail,
          to,
          subject,
          html,
          text,
        });
        if (result.error) {
          this.logger.error(`Resend failed to ${to}: ${result.error.message}`);
          return false;
        }
        this.logger.log(`Resend email sent to ${to}, id: ${result.data?.id}`);
        return true;
      } catch (err) {
        this.logger.error(`Resend send failed to ${to}: ${(err as Error).message}`);
      }
    }

    // Preview mode
    this.logger.log(`[Preview Mode] Email to: ${to}`);
    this.logger.log(`[Preview Mode] Subject: ${subject}`);
    this.logger.log(`[Preview Mode] Text: ${text}`);
    return true;
  }
}