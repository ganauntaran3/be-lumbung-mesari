import { Global, Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { TemplateService } from './template.service';
import { EmailHelperService } from './email/email-helper.service';
import { config } from 'process';

@Global()
@Module({
    imports: [
        ConfigModule,
        MailerModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
                const isDevelopment = configService.get<string>('NODE_ENV') === 'production';
                const smtpHost = configService.get<string>('SMTP_HOST', 'localhost');
                const smtpPort = configService.get<number>('SMTP_PORT', 1025);
                const smtpAddress = configService.get<string>('SMTP_EMAIL_ADDRESS', 'noreply@localhost');

                return {
                    transport: {
                        host: smtpHost,
                        port: smtpPort,
                        secure: !isDevelopment ? false : true,
                        ignoreTLS: !isDevelopment ? false : true,
                        auth: configService.get<string>('SMTP_USER') ? {
                            user: configService.get<string>('SMTP_USER'),
                            pass: configService.get<string>('SMTP_PASS'),
                        } : undefined,
                    },
                    defaults: {
                        from: smtpAddress
                    },
                    template: {
                        dir: join(__dirname, 'email/templates'),
                        adapter: new HandlebarsAdapter(),
                        options: {
                            strict: true,
                        },
                    },
                };
            },
            inject: [ConfigService],
        }),
    ],
    providers: [TemplateService, EmailHelperService],
    exports: [TemplateService, EmailHelperService],
})
export class NotificationModule { }