import { Test, TestingModule } from '@nestjs/testing';
import { TemplateService } from './template.service';
import { NotificationTemplate } from './email.service';

describe('TemplateService', () => {
    let service: TemplateService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [TemplateService],
        }).compile();

        service = module.get<TemplateService>(TemplateService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should have precompiled templates', () => {
        const availableTemplates = service.getAvailableTemplates();
        expect(availableTemplates.length).toBeGreaterThan(0);
        expect(availableTemplates).toContain('registration_confirmation');
        expect(availableTemplates).toContain('registration_approved');
        expect(availableTemplates).toContain('registration_rejected');
    });

    it('should validate template existence', () => {
        expect(service.templateExists(NotificationTemplate.REGISTRATION_CONFIRMATION)).toBe(true);
        expect(service.templateExists(NotificationTemplate.REGISTRATION_APPROVED)).toBe(true);
        expect(service.templateExists('non_existent_template' as NotificationTemplate)).toBe(false);
    });

    it('should render registration confirmation template', () => {
        const templateData = {
            fullname: 'John Doe',
            deposit_amount: 100000,
            bank_name: 'Bank BCA',
            account_number: '1234567890',
            account_name: 'Koperasi Lumbung Mesari',
            instructions: 'Transfer sesuai nominal yang tertera',
        };

        const rendered = service.renderTemplate(NotificationTemplate.REGISTRATION_CONFIRMATION, templateData);

        expect(rendered).toContain('John Doe');
        expect(rendered).toContain('Bank BCA');
        expect(rendered).toContain('1234567890');
        expect(rendered).toContain('Koperasi Lumbung Mesari');
    });

    it('should render registration approved template', () => {
        const templateData = {
            fullname: 'Jane Smith',
            email: 'jane@example.com',
            username: 'janesmith',
        };

        const rendered = service.renderTemplate(NotificationTemplate.REGISTRATION_APPROVED, templateData);

        expect(rendered).toContain('Jane Smith');
        expect(rendered).toContain('jane@example.com');
        expect(rendered).toContain('janesmith');
        expect(rendered).toContain('Selamat!');
    });

    it('should handle conditional blocks in templates', () => {
        const templateDataWithReason = {
            fullname: 'John Doe',
            reason: 'Bukti deposit tidak jelas',
        };

        const templateDataWithoutReason = {
            fullname: 'John Doe',
        };

        const renderedWithReason = service.renderTemplate(NotificationTemplate.REGISTRATION_REJECTED, templateDataWithReason);
        const renderedWithoutReason = service.renderTemplate(NotificationTemplate.REGISTRATION_REJECTED, templateDataWithoutReason);

        expect(renderedWithReason).toContain('Bukti deposit tidak jelas');
        expect(renderedWithoutReason).not.toContain('Catatan dari Administrator');
    });

    it('should generate correct subject for templates', () => {
        const templateData = { fullname: 'John Doe' };

        const subject1 = service.getTemplateSubject(NotificationTemplate.REGISTRATION_CONFIRMATION, templateData);
        const subject2 = service.getTemplateSubject(NotificationTemplate.REGISTRATION_APPROVED, templateData);

        expect(subject1).toBe('Selamat datang di Lumbung Mesari - Konfirmasi Pendaftaran');
        expect(subject2).toBe('Pendaftaran Disetujui - Lumbung Mesari');
    });

    it('should generate text version from HTML', () => {
        const html = '<h1>Hello World</h1><p>This is a <strong>test</strong> email.</p>';
        const text = service.generateTextVersion(html);

        expect(text).toBe('Hello World This is a test email.');
        expect(text).not.toContain('<');
        expect(text).not.toContain('>');
    });

    it('should throw error for non-existent template', () => {
        const templateData = { fullname: 'John Doe' };

        expect(() => {
            service.renderTemplate('non_existent' as NotificationTemplate, templateData);
        }).toThrow('Template not found: non_existent');
    });

    it('should include common data in templates', () => {
        const templateData = { fullname: 'John Doe' };
        const rendered = service.renderTemplate(NotificationTemplate.REGISTRATION_CONFIRMATION, templateData);

        // Should include current year
        const currentYear = new Date().getFullYear();
        expect(rendered).toContain(currentYear.toString());

        // Should include cooperative address
        expect(rendered).toContain('Jl. Contoh No. 123');
    });
});