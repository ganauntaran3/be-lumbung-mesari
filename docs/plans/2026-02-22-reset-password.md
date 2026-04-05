# Reset Password Implementation Plan

**Goal:** Allow an authenticated user to request a password reset email, then set a new password via a secure token link.
**Architecture:** Two endpoints in `auth` module — one authenticated (triggers reset email), one public (confirms reset with token). Reset tokens are stored as new columns on the `users` table, following the same pattern as OTP columns. The `password_reset.hbs` email template already exists.
**Tech Stack:** NestJS, Knex.js, bcrypt, `crypto.randomBytes`, `EmailHelperService`, `NotificationTemplate.PASSWORD_RESET`

---

## Flow Summary

```
1. POST /auth/reset-password  (requires JWT)
   → generate secure random token
   → store raw token + expiry (1 hour) on users row
   → send password_reset email with link: ${FRONTEND_URL}/reset-password?token=<token>
   → return 200 { message: 'Reset link sent to your email.' }

2. POST /auth/reset-password/confirm  (public, no JWT)
   → validate token exists & not expired
   → hash new password with bcrypt
   → update password on users row
   → clear token + expiry
   → return 200 { message: 'Password updated successfully.' }
```

---

## Task 1 — Database Migration: Add Password Reset Token Columns (DONE)

**Files:**

- Create: `src/database/migrations/20260222000000_alter_users_table_add_password_reset.ts`

**Migration content:**

```typescript
import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.string('password_reset_token', 255).nullable()
    table.timestamp('password_reset_expires_at').nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('password_reset_token')
    table.dropColumn('password_reset_expires_at')
  })
}
```

**Run:**

```bash
npm run migrate:latest
```

Expected: Migration applied, columns exist on `users` table.
**Notes:** This task already done.

---

## Task 2 — Update User Interfaces

**Files:**

- Modify: `src/users/interface/users.ts`

**Changes — add to `User` type:**

```typescript
password_reset_token?: string | null
password_reset_expires_at?: Date | null
```

**Changes — add to `UpdateUserEntity` interface:**

```typescript
password_reset_token?: string | null
password_reset_expires_at?: Date | null
```

**Changes — add to `UpdateUserDto` type:**

```typescript
passwordResetToken?: string | null
passwordResetExpiresAt?: Date | null
```

**Changes — add to `UsersService.transformUserToDb()`** (snake_case mapping):

```typescript
const {
  phoneNumber,
  roleId,
  otpCode,
  otpVerified,
  otpExpiresAt,
  passwordResetToken,       // ← add
  passwordResetExpiresAt,   // ← add
  ...otherData
} = user
return {
  ...otherData,
  phone_number: phoneNumber,
  role_id: roleId,
  otp_code: otpCode,
  otp_verified: otpVerified,
  otp_expires_at: otpExpiresAt,
  password_reset_token: passwordResetToken,             // ← add
  password_reset_expires_at: passwordResetExpiresAt,    // ← add
}
```

---

## Task 3 — Add `findByResetToken` to UsersRepository

**Files:**

- Modify: `src/users/users.repository.ts`

**Add method:**

```typescript
async findByResetToken(token: string): Promise<User | undefined> {
  const result = await this.knex('users')
    .select([
      'users.id',
      'users.email',
      'users.fullname',
      'users.username',
      'users.password',
      'users.status',
      'users.role_id',
      'users.password_reset_token',
      'users.password_reset_expires_at',
    ])
    .where('users.password_reset_token', token)
    .first()

  return result as User | undefined
}
```

---

## Task 4 — Create DTOs

**Files:**

- Create: `src/auth/dto/reset-password.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger'

import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator'

export class ConfirmResetPasswordDto {
  @ApiProperty({ description: 'Password reset token received via email' })
  @IsString()
  @IsNotEmpty()
  token: string

  @ApiProperty({
    description: 'New password (min 8 chars, must contain uppercase)'
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/[A-Z]/, {
    message: 'Password must contain at least one uppercase letter'
  })
  newPassword: string

  @ApiProperty({ description: 'Must match newPassword' })
  @IsString()
  @IsNotEmpty()
  confirmPassword: string
}

export class RequestResetPasswordResponseDto {
  @ApiProperty({ example: 'Reset link sent to your email.' })
  message: string
}

export class ConfirmResetPasswordResponseDto {
  @ApiProperty({ example: 'Password updated successfully.' })
  message: string
}
```

---

## Task 5 — Add Reset Password Logic to AuthService

**Files:**

- Modify: `src/auth/auth.service.ts`

**Add import:**

```typescript
import { randomBytes } from 'node:crypto'
```

**Add method `requestPasswordReset`:**

```typescript
async requestPasswordReset(userId: string) {
  const user = await this.usersService.findByIdRaw(userId)
  if (!user) {
    throw new NotFoundException('User not found.')
  }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 1)

  await this.usersService.update(user.id, {
    passwordResetToken: token,
    passwordResetExpiresAt: expiresAt,
  })

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`

  const emailSent = await this.sendPasswordResetEmail(user, resetUrl)

  this.logger.log(
    `Password reset requested for ${user.email} - email sent: ${emailSent}`
  )

  return {
    message: emailSent
      ? 'Reset link sent to your email.'
      : 'Reset link generated but could not be delivered. Please contact support.',
    emailSent,
  }
}
```

**Add method `confirmPasswordReset`:**

```typescript
async confirmPasswordReset(token: string, newPassword: string, confirmPassword: string) {
  if (newPassword !== confirmPassword) {
    throw new BadRequestException('Password confirmation does not match.')
  }

  const user = await this.usersService.findByResetToken(token)
  if (!user) {
    throw new BadRequestException('Invalid or expired reset token.')
  }

  if (!user.password_reset_expires_at || new Date() > new Date(user.password_reset_expires_at)) {
    throw new BadRequestException('Reset token has expired. Please request a new one.')
  }

  const hashedPassword = await hash(newPassword, 10)

  await this.usersService.update(user.id, {
    password: hashedPassword,
    passwordResetToken: null,
    passwordResetExpiresAt: null,
  })

  this.logger.log(`Password reset successfully for user ${user.id}`)

  return { message: 'Password updated successfully.' }
}
```

**Add private helper `sendPasswordResetEmail`:**

```typescript
private async sendPasswordResetEmail(user: any, resetUrl: string): Promise<boolean> {
  try {
    const emailData: EmailData = {
      template: NotificationTemplate.PASSWORD_RESET,
      recipient: user.email,
      data: {
        fullname: user.fullname,
        resetUrl,
        expiry_time: '1 jam',
      },
      priority: 'high',
    }

    await this.emailHelperService.sendEmail(emailData)
    this.logger.log(`Password reset email sent successfully to ${user.email}`)
    return true
  } catch (error) {
    this.logger.error(`Failed to send password reset email to ${user.email}:`, error)
    return false
  }
}
```

---

## Task 6 — Add `findByResetToken` and `findByIdRaw` to UsersService

**Files:**

- Modify: `src/users/users.service.ts`

**Add method `findByResetToken`** (returns raw user including password*reset*\* fields):

```typescript
async findByResetToken(token: string) {
  return await this.usersRepository.findByResetToken(token)
}
```

**Add method `findByIdRaw`** (returns user with email/fullname for emailing, no password):

```typescript
async findByIdRaw(id: string) {
  const user = await this.usersRepository.findById(id)
  if (!user) return undefined
  const { password, ...rest } = user
  return rest
}
```

> Note: `update()` in `UsersService` already calls `transformUserToDb()`, so adding `passwordResetToken`/`passwordResetExpiresAt` fields to `UpdateUserDto` and the transformer (Task 2) is sufficient.

---

## Task 7 — Add Endpoints to AuthController

**Files:**

- Modify: `src/auth/auth.controller.ts`

**Add imports:**

```typescript
import {
  ConfirmResetPasswordDto,
  ConfirmResetPasswordResponseDto,
  RequestResetPasswordResponseDto
} from './dto/reset-password.dto'
```

**Add endpoint `POST /auth/reset-password`** (requires JWT):

```typescript
@UseGuards(JwtAuthGuard)
@Post('reset-password')
@HttpCode(HttpStatus.OK)
@ApiOperation({
  summary: 'Request password reset email',
  description: 'Generates a reset token and sends a reset link to the authenticated user\'s email. Token expires in 1 hour.',
})
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Reset link sent to email',
  type: RequestResetPasswordResponseDto,
})
@ApiUnauthorizedResponse({
  description: 'Unauthorized - invalid or expired token',
  schema: TokenErrorSchemas.invalidToken,
})
@ApiNotFoundResponse({
  description: 'User not found',
  schema: AuthErrorSchemas.userNotFound,
})
async requestPasswordReset(@CurrentUser() user: UserJWT) {
  try {
    return await this.authService.requestPasswordReset(user.id)
  } catch (error) {
    if (error instanceof HttpException) throw error
    console.error('Unexpected error during password reset request:', error)
    throw new InternalServerErrorException({
      statusCode: 500,
      message: 'An unexpected error occurred',
      error: 'Internal Server Error',
    })
  }
}
```

**Add endpoint `POST /auth/reset-password/confirm`** (public):

```typescript
@Post('reset-password/confirm')
@HttpCode(HttpStatus.OK)
@ApiOperation({
  summary: 'Confirm password reset with token',
  description: 'Validates the reset token from email and sets a new password.',
})
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Password updated successfully',
  type: ConfirmResetPasswordResponseDto,
})
@ApiBadRequestResponse({
  description: 'Invalid/expired token or password mismatch',
  schema: AuthErrorSchemas.validationFailed,
})
@ApiBody({ type: ConfirmResetPasswordDto })
async confirmPasswordReset(@Body() dto: ConfirmResetPasswordDto) {
  try {
    return await this.authService.confirmPasswordReset(
      dto.token,
      dto.newPassword,
      dto.confirmPassword,
    )
  } catch (error) {
    if (error instanceof HttpException) throw error
    console.error('Unexpected error during password reset confirm:', error)
    throw new InternalServerErrorException({
      statusCode: 500,
      message: 'An unexpected error occurred',
      error: 'Internal Server Error',
    })
  }
}
```

---

## Task 8 — Verify Email Template Variables

**Files:**

- Read (no change needed): `src/notifications/email/templates/password_reset.hbs`

The template expects:

- `{{fullname}}` — user's full name ✅ (passed via `data.fullname`)
- `{{resetUrl}}` — the full reset URL ✅ (passed via `data.resetUrl`)
- `{{expiry_time}}` — human-readable expiry string ✅ (passed as `'1 jam'`)
- `{{year}}` — auto-injected by `TemplateService.renderTemplate()` ✅

No changes needed to the template.

---

## Task 9 — Environment Variable Documentation

**Files:**

- Modify: `.env.example` (if it exists) or document in CLAUDE.md

Add:

```
FRONTEND_URL=http://localhost:3000   # Used for password reset link in email
```

> `TemplateService.getCommonUrls()` already reads `FRONTEND_URL`. The same variable is reused in `requestPasswordReset` to build the reset link.

---

## Success Criteria

| #   | Criterion                                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `POST /auth/reset-password` with valid JWT returns `{ message: 'Reset link sent to your email.', emailSent: true }`               |
| 2   | `users` table has `password_reset_token` and `password_reset_expires_at` columns populated after step 1                           |
| 3   | Email is received with a valid clickable reset link containing the token                                                          |
| 4   | `POST /auth/reset-password/confirm` with valid token + matching passwords returns `{ message: 'Password updated successfully.' }` |
| 5   | `password_reset_token` and `password_reset_expires_at` are cleared (NULL) after successful reset                                  |
| 6   | User can login with new password                                                                                                  |
| 7   | Expired token (> 1 hour) is rejected with 400 Bad Request                                                                         |
| 8   | Mismatched `newPassword` and `confirmPassword` are rejected with 400 Bad Request                                                  |

---

## Execution Order

```
Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7
                                                         ↑
                                              (Task 8 & 9 can run anytime)
```
