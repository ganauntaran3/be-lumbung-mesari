import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { TemplateService } from '../template.service';

export enum NotificationTemplate {
    REGISTRATION_CONFIRMATION = 'registration_confirmation',
    REGISTRATION_APPROVED = 'registration_approved',
    REGISTRATION_REJECTED = 'registration_rejected',
    ADMIN_NEW_REGISTRATION = 'admin_new_registration',
    PROFILE_UPDATED = 'profile_updated',
    PASSWORD_RESET = 'password_reset',
    ACCOUNT_SUSPENDED = 'account_suspended',
    OTP_VERIFICATION = 'otp_verification',
}

export interface EmailData {
    template: NotificationTemplate;
    recipient: string;
    data: Record<string, any>;
    priority?: 'high' | 'normal' | 'low';
}

@Injectable()
export class EmailHelperService {
    private readonly logger = new Logger(EmailHelperService.name);

    constructor(
        private readonly mailerService: MailerService,
        private readonly templateService: TemplateService,
    ) { }

    async sendEmail(emailData: EmailData): Promise<void> {
        try {
            if (!this.templateService.templateExists(emailData.template)) {
                throw new Error(`Template not found: ${emailData.template}`);
            }

            const htmlContent = this.templateService.renderTemplate(emailData.template, emailData.data);
            const subject = this.templateService.getTemplateSubject(emailData.template, emailData.data);
            const textContent = this.templateService.generateTextVersion(htmlContent);

            await this.mailerService.sendMail({
                to: emailData.recipient,
                subject: subject,
                html: htmlContent,
                text: textContent,
                priority: emailData.priority || 'normal',
            });

            this.logger.log(`Email sent successfully to ${emailData.recipient} with template ${emailData.template}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to send email to ${emailData.recipient}: ${errorMessage}`, error);
            throw error;
        }
    }

    async sendBulkEmail(emailDataList: EmailData[]): Promise<void> {
        const promises = emailDataList.map(emailData => this.sendEmail(emailData));
        await Promise.allSettled(promises);
    }
}