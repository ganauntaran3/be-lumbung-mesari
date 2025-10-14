# Email Template Engine with Handlebars

This module provides a comprehensive email template engine using Handlebars for the Lumbung Mesari cooperative system.

## Features

- ✅ **Handlebars Template Engine**: Full Handlebars support with custom helpers
- ✅ **Professional Email Templates**: Pre-built responsive HTML templates
- ✅ **Automatic Text Generation**: HTML to text conversion for email clients
- ✅ **Template Validation**: Runtime template existence validation
- ✅ **Custom Helpers**: Indonesian currency, date formatting, and more
- ✅ **Development Support**: MailHog integration for testing
- ✅ **Type Safety**: Full TypeScript support with proper interfaces

## Template Structure

Templates are stored in `src/notifications/templates/` as `.hbs` files:

```
src/notifications/templates/
├── registration_confirmation.hbs
├── registration_approved.hbs
├── registration_rejected.hbs
├── admin_new_registration.hbs
├── profile_updated.hbs
├── password_reset.hbs
└── account_suspended.hbs
```

## Available Templates

### 1. Registration Confirmation (`registration_confirmation`)
Sent when a user completes step 1 of registration.

**Required Data:**
- `fullname`: User's full name
- `deposit_amount`: Deposit amount (number)
- `bank_name`: Bank name for transfer
- `account_number`: Bank account number
- `account_name`: Account holder name
- `instructions`: Payment instructions

### 2. Registration Approved (`registration_approved`)
Sent when admin approves a user's registration.

**Required Data:**
- `fullname`: User's full name
- `email`: User's email
- `username`: User's username

### 3. Registration Rejected (`registration_rejected`)
Sent when admin rejects a user's registration.

**Required Data:**
- `fullname`: User's full name
- `reason` (optional): Rejection reason

### 4. Admin New Registration (`admin_new_registration`)
Sent to admins when a new user registers.

**Required Data:**
- `fullname`: User's full name
- `email`: User's email
- `username`: User's username
- `phone_number`: User's phone
- `address`: User's address
- `created_at`: Registration date
- `status`: Current status
- `deposit_image_url` (optional): Deposit proof URL

### 5. Profile Updated (`profile_updated`)
Sent when user updates their profile.

**Required Data:**
- `fullname`: User's full name
- `updated_at`: Update timestamp
- `ip_address`: User's IP address
- `changes` (optional): Array of changed fields

### 6. Password Reset (`password_reset`)
Sent when user requests password reset.

**Required Data:**
- `fullname`: User's full name
- `resetUrl`: Password reset URL
- `expiry_time`: Link expiry time (e.g., "1 jam")

### 7. Account Suspended (`account_suspended`)
Sent when admin suspends a user account.

**Required Data:**
- `fullname`: User's full name
- `username`: User's username
- `reason` (optional): Suspension reason
- `suspended_at`: Suspension timestamp

## Usage

### Basic Email Sending

```typescript
import { EmailService, NotificationTemplate } from './email.service';

// Inject EmailService in your service/controller
constructor(private readonly emailService: EmailService) {}

// Send an email
await this.emailService.sendEmail({
    template: NotificationTemplate.REGISTRATION_CONFIRMATION,
    recipient: 'user@example.com',
    data: {
        fullname: 'John Doe',
        deposit_amount: 100000,
        bank_name: 'Bank BCA',
        account_number: '1234567890',
        account_name: 'Koperasi Lumbung Mesari',
        instructions: 'Transfer sesuai nominal yang tertera',
    },
});
```

### Bulk Email Sending

```typescript
const notifications = [
    {
        template: NotificationTemplate.ADMIN_NEW_REGISTRATION,
        recipient: 'admin1@example.com',
        data: { /* user data */ },
    },
    {
        template: NotificationTemplate.ADMIN_NEW_REGISTRATION,
        recipient: 'admin2@example.com',
        data: { /* user data */ },
    },
];

await this.emailService.sendBulkEmail(notifications);
```

### Template Validation

```typescript
// Check if template exists
const exists = this.emailService.validateEmailTemplate(
    NotificationTemplate.REGISTRATION_CONFIRMATION
);

// Get available templates
const templates = this.templateService.getAvailableTemplates();
```

## Custom Handlebars Helpers

The template engine includes several custom helpers:

### Currency Helper
```handlebars
{{currency 100000}} <!-- Output: Rp 100.000 -->
```

### Date Formatting Helper
```handlebars
{{formatDate created_at}} <!-- Output: 10 Januari 2025, 14:30 -->
```

### Conditional Helpers
```handlebars
{{#if (eq status "active")}}
    User is active
{{/if}}

{{#if (neq status "suspended")}}
    User is not suspended
{{/if}}
```

### String Helpers
```handlebars
{{upper username}} <!-- UPPERCASE -->
{{lower email}} <!-- lowercase -->
{{truncate description 50}} <!-- Truncate to 50 chars -->
```

## Template Development

### Creating New Templates

1. Create a new `.hbs` file in `src/notifications/templates/`
2. Add the template enum to `NotificationTemplate`
3. Add subject mapping in `TemplateService.getTemplateSubject()`
4. The template will be automatically compiled on service startup

### Template Structure

All templates should follow this structure:

```handlebars
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Title</title>
    <style>
        /* Inline CSS for email compatibility */
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <!-- Header content -->
        </div>
        
        <div class="content">
            <!-- Main content with variables -->
            <h2>Hello {{fullname}},</h2>
            
            {{#if conditionalData}}
            <p>Conditional content</p>
            {{/if}}
        </div>
        
        <div class="footer">
            <p>&copy; {{year}} Koperasi Lumbung Mesari. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

### Common Template Variables

These variables are automatically available in all templates:

- `year`: Current year
- `loginUrl`: Frontend login URL
- `adminUrl`: Admin panel URL
- `cooperative_address`: Cooperative address

## Development & Testing

### MailHog Setup

For development, use MailHog to capture emails:

```bash
# Start MailHog with Docker Compose
docker-compose up mailhog

# Access web interface
open http://localhost:8025
```

### Testing Templates

```bash
# Test email configuration
npm run test:email

# Test all email templates
npm run test:email-templates

# Run template unit tests
npm test -- --testPathPattern=template.service.spec.ts

# Run email service tests
npm test -- --testPathPattern=email.service.spec.ts

# Run integration tests
npm test -- --testPathPattern=email-template-integration.spec.ts
```

### Environment Configuration

```bash
# Development (.env)
NODE_ENV=development
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
EMAIL_FROM=noreply@lumbungmesari.com

# Production (.env.production)
NODE_ENV=production
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@lumbungmesari.com
```

## Error Handling

The email service includes comprehensive error handling:

- Template validation errors
- SMTP connection errors
- Template rendering errors
- Automatic retry mechanisms (future enhancement)

## Performance Considerations

- Templates are precompiled on service startup
- Template caching for better performance
- Bulk email support for multiple recipients
- Automatic text version generation

## Security Features

- Input sanitization in templates
- XSS protection through Handlebars escaping
- Secure email headers
- Rate limiting support (configurable)

## Future Enhancements

- [ ] Email queue system with Bull/Redis
- [ ] Email delivery tracking
- [ ] Template versioning
- [ ] A/B testing support
- [ ] Email analytics
- [ ] Attachment support
- [ ] Email scheduling

## Troubleshooting

### Common Issues

1. **Template not found**: Ensure template file exists and service is restarted
2. **SMTP errors**: Check email configuration and network connectivity
3. **Template rendering errors**: Validate template syntax and required data
4. **Missing variables**: Check template data completeness

### Debug Mode

Enable debug logging:

```typescript
// In your service
this.logger.debug('Template data:', templateData);
```

### Template Reloading

For development, reload templates without restart:

```typescript
this.templateService.reloadTemplates();
```