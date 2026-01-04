import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import {
  UserRole,
  generateInsufficientPermissionsMessage
} from '../../common/constants'
import { ROLES_KEY } from '../decorators/roles.decorator'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

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
        generateInsufficientPermissionsMessage(user.role)
      )
    }

    return true
  }
}
