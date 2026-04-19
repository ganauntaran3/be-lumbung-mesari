import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

import { UserStatus } from '../../common/constants'
import { JwtPayload } from '../../interface/jwt'
import { UsersService } from '../../users/users.service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET')
    })
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub)

    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    if (
      user.status === UserStatus.INACTIVE ||
      user.status === UserStatus.REJECTED
    ) {
      throw new UnauthorizedException('Account is deactivated')
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.roleId,
      status: user.status
    }
  }
}
