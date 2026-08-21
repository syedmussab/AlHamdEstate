import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";
import { AuthUser } from "../interfaces/auth-user.interface";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user: AuthUser = request.user;
    if (!user) throw new ForbiddenException("Not authenticated");

    const hasAll = required.every((perm) => user.permissions.includes(perm));
    if (!hasAll) {
      throw new ForbiddenException(`Missing permission: ${required.join(", ")}`);
    }
    return true;
  }
}
