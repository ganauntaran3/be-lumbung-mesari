import { Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { NotificationTemplate } from './email/email-helper.service';

export interface TemplateData {
    [key: string]: any;
    // Common template variables
    year?: number;
    loginUrl?: string;
    adminUrl?: string;
    cooperative_address?: string;
}

@Injectable()
export class TemplateService {
    private readonly logger = new Logger(TemplateService.name);
    private readonly templatesPath = this.getTemplatesPath();
    private compiledTemplates = new Map<string, HandlebarsTemplateDelegate>();

    constructor() {
        this.registerHelpers();
        this.precompileTemplates();
    }

    private getTemplatesPath(): string {
        return path.join(__dirname, 'email', 'templates');
    }

    /**
     * Register custom Handlebars helpers
     */
    private registerHelpers(): void {
        // Helper for formatting currency
        Handlebars.registerHelper('currency', (amount: number) => {
            return new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
            }).format(amount);
        });

        // Helper for formatting dates
        Handlebars.registerHelper('formatDate', (date: Date | string) => {
            const dateObj = typeof date === 'string' ? new Date(date) : date;
            return new Intl.DateTimeFormat('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Jakarta',
            }).format(dateObj);
        });

        // Helper for conditional equality
        Handlebars.registerHelper('eq', (a: any, b: any) => {
            return a === b;
        });

        // Helper for conditional not equality
        Handlebars.registerHelper('neq', (a: any, b: any) => {
            return a !== b;
        });

        // Helper for uppercase
        Handlebars.registerHelper('upper', (str: string) => {
            return str ? str.toUpperCase() : '';
        });

        // Helper for lowercase
        Handlebars.registerHelper('lower', (str: string) => {
            return str ? str.toLowerCase() : '';
        });

        // Helper for truncating text
        Handlebars.registerHelper('truncate', (str: string, length: number) => {
            if (!str) return '';
            return str.length > length ? str.substring(0, length) + '...' : str;
        });
    }

    /**
     * Precompile all templates for better performance
     */
    private precompileTemplates(): void {
        console.log('🔍 DEBUG: Starting template precompilation...');
        console.log('🔍 DEBUG: Templates path:', this.templatesPath);
        console.log('🔍 DEBUG: __dirname:', __dirname);

        try {
            // Check if templates directory exists
            if (!fs.existsSync(this.templatesPath)) {
                console.log('❌ DEBUG: Templates directory does not exist:', this.templatesPath);
                this.logger.error(`Templates directory not found: ${this.templatesPath}`);
                return;
            }

            const templateFiles = fs.readdirSync(this.templatesPath);
            console.log('🔍 DEBUG: Found template files:', templateFiles);

            for (const file of templateFiles) {
                if (file.endsWith('.hbs')) {
                    const templateName = file.replace('.hbs', '');
                    const templatePath = path.join(this.templatesPath, file);
                    console.log(`🔍 DEBUG: Processing template: ${templateName} from ${templatePath}`);

                    const templateContent = fs.readFileSync(templatePath, 'utf8');
                    const compiled = Handlebars.compile(templateContent);
                    this.compiledTemplates.set(templateName, compiled);

                    console.log(`✅ DEBUG: Template compiled successfully: ${templateName}`);
                    this.logger.log(`Template compiled: ${templateName}`);
                }
            }

            console.log('🔍 DEBUG: All compiled templates:', Array.from(this.compiledTemplates.keys()));
        } catch (error) {
            console.log('❌ DEBUG: Error during template precompilation:', error);
            this.logger.error('Failed to precompile templates:', error);
        }
    }

    /**
     * Render a template with data
     */
    renderTemplate(templateName: NotificationTemplate, data: TemplateData): string {
        try {
            const template = this.compiledTemplates.get(templateName);

            if (!template) {
                throw new Error(`Template not found: ${templateName}`);
            }

            // Add common data that's available to all templates
            const templateData = {
                ...data,
                year: new Date().getFullYear(),
                cooperative_address: this.getCooperativeAddress(),
                ...this.getCommonUrls(),
            };

            return template(templateData);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to render template ${templateName}:`, error);
            throw new Error(`Template rendering failed: ${errorMessage}`);
        }
    }

    /**
     * Get subject for a template (extracted from template or predefined)
     */
    getTemplateSubject(templateName: NotificationTemplate, data: TemplateData): string {
        const subjects: Record<NotificationTemplate, string> = {
            [NotificationTemplate.REGISTRATION_CONFIRMATION]: 'Selamat datang di Lumbung Mesari - Konfirmasi Pendaftaran',
            [NotificationTemplate.REGISTRATION_APPROVED]: 'Pendaftaran Disetujui - Lumbung Mesari',
            [NotificationTemplate.REGISTRATION_REJECTED]: 'Pendaftaran Perlu Diperbaiki - Lumbung Mesari',
            [NotificationTemplate.ADMIN_NEW_REGISTRATION]: 'Pendaftaran Anggota Baru Menunggu Persetujuan',
            [NotificationTemplate.PROFILE_UPDATED]: 'Profil Diperbarui - Lumbung Mesari',
            [NotificationTemplate.PASSWORD_RESET]: 'Reset Password - Lumbung Mesari',
            [NotificationTemplate.ACCOUNT_SUSPENDED]: 'Akun Disuspend - Lumbung Mesari',
            [NotificationTemplate.OTP_VERIFICATION]: 'Kode Verifikasi OTP - Lumbung Mesari',
        };

        let subject = subjects[templateName] || 'Notifikasi - Lumbung Mesari';

        // Replace variables in subject if needed
        Object.keys(data).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            subject = subject.replace(regex, String(data[key] || ''));
        });

        return subject;
    }

    /**
     * Validate if template exists
     */
    templateExists(templateName: NotificationTemplate): boolean {
        console.log("Compiled templates", this.compiledTemplates)
        console.log("Template name:", templateName);
        return this.compiledTemplates.has(templateName);
    }

    /**
     * Get list of available templates
     */
    getAvailableTemplates(): string[] {
        return Array.from(this.compiledTemplates.keys());
    }

    /**
     * Reload templates (useful for development)
     */
    reloadTemplates(): void {
        this.compiledTemplates.clear();
        this.precompileTemplates();
        this.logger.log('Templates reloaded');
    }

    /**
     * Get cooperative address (could be from config)
     */
    private getCooperativeAddress(): string {
        return process.env.COOPERATIVE_ADDRESS ||
            'Jl. Contoh No. 123, Jakarta Selatan 12345, Indonesia';
    }

    /**
     * Get common URLs used in templates
     */
    private getCommonUrls(): { loginUrl?: string; adminUrl?: string } {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        return {
            loginUrl: `${baseUrl}/login`,
            adminUrl: `${baseUrl}/admin/users`,
        };
    }

    /**
     * Generate text version from HTML (basic implementation)
     */
    generateTextVersion(html: string): string {
        // Remove HTML tags and clean up whitespace
        return html
            .replace(/<\/?(h[1-6]|p|div|br)[^>]*>/gi, '\n') // Add line breaks for block elements
            .replace(/<[^>]*>/g, ' ') // Remove HTML tags and replace with space
            .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
            .replace(/\n\s*\n/g, '\n\n') // Clean up line breaks
            .trim();
    }
}
