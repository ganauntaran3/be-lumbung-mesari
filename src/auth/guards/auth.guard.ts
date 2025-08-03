import {
  Injectable,
  ExecutionContext,
  UnauthorizedException
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Add your custom logic here if needed
    return super.canActivate(context)
  }

  handleRequest(err: any, user: any, info: any) {
    // You can throw custom exceptions based on specific errors
    if (info instanceof TokenExpiredError) {
      throw new UnauthorizedException('Token expired')
    }

    if (info instanceof JsonWebTokenError) {
      throw new UnauthorizedException('Invalid token')
    }

    if (err || !user) {
      throw new UnauthorizedException('Unauthorized')
    }

    return user
  }
}
