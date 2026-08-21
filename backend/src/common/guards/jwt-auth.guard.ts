import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { AuthUser } from "../interfaces/auth-user.interface";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException("No token provided");

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          deletedAt: true,
          roles: { select: { role: { select: { name: true, permissions: { select: { permission: { select: { name: true } } } } } } } },
        },
      });

      if (!user || !user.isActive || user.deletedAt) {
        throw new UnauthorizedException("User is inactive or deleted");
      }

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles.map((r) => r.role.name),
        permissions: user.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.name)),
      };

      request.user = authUser;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  private extractToken(request: any): string | null {
    const [type, token] = request.headers?.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : null;
  }
}
