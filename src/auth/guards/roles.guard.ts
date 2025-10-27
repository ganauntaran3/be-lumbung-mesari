import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { UserRole } from 'src/common/constants'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    )

    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    const { user } = context.switchToHttp().getRequest()

    if (!user.role) {
      throw new ForbiddenException('User has no role assigned')
    }

    const hasRole = requiredRoles.includes(user.role)

    if (!hasRole) {
      throw new ForbiddenException(
        `User with role ${user.role} does not have sufficient permissions. Required: [${requiredRoles.join(', ')}]`
      )
    }

    return true
  }
}
