import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'

import { DatabaseModule } from '../database/database.module'
import { UsersModule } from '../users/users.module'
import { UsersSavingsModule } from '../users-savings/users-savings.module'

import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { OtpService } from './services/otp.service'
import { JwtStrategy } from './strategies/jwt.strategy'

@Module({
  imports: [
    UsersModule,
    UsersSavingsModule,
    DatabaseModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>(
          'JWT_SECRET',
          'your-default-secret-key'
        ),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1h')
        }
      }),
      inject: [ConfigService]
    })
  ],
  providers: [AuthService, JwtStrategy, OtpService],
  controllers: [AuthController],
  exports: [AuthService]
})
export class AuthModule {}
