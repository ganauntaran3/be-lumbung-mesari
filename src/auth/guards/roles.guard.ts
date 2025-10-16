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

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    const { user } = context.switchToHttp().getRequest()

    // Ensure user exists and has a role
    if (!user || !user.role) {
      throw new ForbiddenException('User has no role assigned')
    }

    // Check if user's role is in the required roles
    const hasRole = requiredRoles.some((role) => user.role === role)

    if (!hasRole) {
      throw new ForbiddenException(
        `User with role ${user.role} does not have sufficient permissions. Required: [${requiredRoles.join(', ')}]`
      )
    }

    return true
  }
}
