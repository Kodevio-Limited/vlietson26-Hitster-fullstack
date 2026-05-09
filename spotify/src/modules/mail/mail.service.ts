import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendVerificationCode(email: string, code: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'OV Bouwradio Admin - Verification Code',
        template: './verification', // path to handlebars template
        context: {
          code,
        },
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      // We don't throw here to avoid breaking the auth flow if email fails, 
      // but in production you might want to.
    }
  }
}
