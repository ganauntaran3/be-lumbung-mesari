import {
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context)
  }

  handleRequest(err: any, user: any, info: any) {
    if (info instanceof TokenExpiredError) {
      throw new UnauthorizedException('Refresh token expired')
    }

    if (info instanceof JsonWebTokenError) {
      throw new UnauthorizedException('Invalid refresh token')
    }

    if (err || !user) {
      throw new UnauthorizedException('Unauthorized, please authenticate')
    }

    return user
  }
}
