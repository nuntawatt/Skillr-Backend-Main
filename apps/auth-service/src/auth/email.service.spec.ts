jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}));

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn(),
    },
  })),
}));

import nodemailer from 'nodemailer';
import { Resend } from 'resend';

import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService', () => {
  const makeConfig = (map: Record<string, any>) =>
    ({
      get: jest.fn((key: string) => map[key]),
    }) as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendOtpEmail / sendPasswordChangedEmail', () => {
    it('delegates to sendEmail', async () => {
      const cfg = makeConfig({});
      const svc = new EmailService(cfg);

      const sendEmailSpy = jest
        .spyOn(svc as any, 'sendEmail')
        .mockResolvedValue(true);

      await expect(svc.sendOtpEmail('a@b.com', '123456')).resolves.toBe(true);
      expect(sendEmailSpy).toHaveBeenCalled();

      await expect(svc.sendPasswordChangedEmail('a@b.com')).resolves.toBe(true);
      expect(sendEmailSpy).toHaveBeenCalled();
    });
  });

  describe('sendEmail', () => {
    it('uses SMTP when configured and succeeds', async () => {
      const transporter = {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'm1' }),
      };
      (nodemailer.createTransport as jest.Mock).mockReturnValue(transporter);

      const cfg = makeConfig({
        EMAIL_HOST: 'smtp.host',
        EMAIL_PORT: 587,
        EMAIL_USER: 'u',
        EMAIL_PASS: 'p',
        MAIL_FROM: 'no-reply@example.com',
      });
      const svc = new EmailService(cfg);

      const ok = await (svc as any).sendEmail(
        'to@example.com',
        'subject',
        '<b>hi</b>',
        'hi',
      );

      expect(ok).toBe(true);
      expect(transporter.sendMail).toHaveBeenCalled();
      expect(Resend).not.toHaveBeenCalled();
    });

    it('falls back to Resend when SMTP fails and Resend configured', async () => {
      const transporter = {
        sendMail: jest.fn().mockRejectedValue(new Error('smtp fail')),
      };
      (nodemailer.createTransport as jest.Mock).mockReturnValue(transporter);

      const cfg = makeConfig({
        EMAIL_HOST: 'smtp.host',
        EMAIL_PORT: 587,
        EMAIL_USER: 'u',
        EMAIL_PASS: 'p',
        RESEND_API_KEY: 'rk',
        MAIL_FROM: 'no-reply@example.com',
      });
      const svc = new EmailService(cfg);

      const resendInstance = (Resend as unknown as jest.Mock).mock.results[0]
        .value;
      resendInstance.emails.send.mockResolvedValue({ data: { id: 'r1' } });

      const ok = await (svc as any).sendEmail(
        'to@example.com',
        'subject',
        '<b>hi</b>',
        'hi',
      );

      expect(ok).toBe(true);
      expect(resendInstance.emails.send).toHaveBeenCalled();
    });

    it('returns true in preview mode when no providers configured', async () => {
      const cfg = makeConfig({});
      const svc = new EmailService(cfg);

      const ok = await (svc as any).sendEmail(
        'to@example.com',
        'subject',
        '<b>hi</b>',
        'hi',
      );

      expect(ok).toBe(true);
      expect(nodemailer.createTransport).not.toHaveBeenCalled();
      expect(Resend).not.toHaveBeenCalled();
    });
  });
});
