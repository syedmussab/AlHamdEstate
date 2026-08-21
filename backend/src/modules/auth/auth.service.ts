import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../common/services/audit.service";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
} from "./dto/auth.dto";
import { randomBytes } from "crypto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService
  ) {}

  async register(dto: RegisterDto, ip?: string, userAgent?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException("Email already registered");

    const staffRole = await this.prisma.role.findUnique({ where: { name: "Staff" } });

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        roles: staffRole
          ? { create: { roleId: staffRole.id } }
          : undefined,
      },
    });

    await this.audit.log({
      userId: user.id,
      action: "REGISTER",
      entity: "User",
      entityId: user.id,
      newValue: { email: user.email },
      ipAddress: ip,
      userAgent,
    });

    return { message: "Registration successful. Please login." };
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException("Invalid credentials");

    const tokens = await this.issueTokens(user.id);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), refreshTokenHash: await bcrypt.hash(tokens.refreshToken, 10) },
    });

    await this.audit.log({
      userId: user.id,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
      ipAddress: ip,
      userAgent,
    });

    return { ...tokens, user: await this.getProfile(user.id) };
  }

  async refresh(dto: RefreshTokenDto, ip?: string, userAgent?: string) {
    let payload: { sub: string; type: string };
    try {
      payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
    if (payload.type !== "refresh") throw new UnauthorizedException("Invalid token type");

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive || user.deletedAt || !user.refreshTokenHash) {
      throw new UnauthorizedException("Session expired");
    }

    const valid = await bcrypt.compare(dto.refreshToken, user.refreshTokenHash);
    if (!valid) throw new UnauthorizedException("Refresh token reused");

    const tokens = await this.issueTokens(user.id);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: await bcrypt.hash(tokens.refreshToken, 10) },
    });

    await this.audit.log({
      userId: user.id,
      action: "TOKEN_REFRESH",
      entity: "User",
      entityId: user.id,
      ipAddress: ip,
      userAgent,
    });

    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
    return { message: "Logged out" };
  }

  async me(userId: string): Promise<AuthUser & { email: string }> {
    return this.getProfile(userId);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        roles: { select: { role: { select: { name: true, permissions: { select: { permission: { select: { name: true } } } } } } } },
      },
    });
    if (!user) throw new UnauthorizedException("User not found");

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      roles: user.roles.map((r) => r.role.name),
      permissions: user.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.name)),
    };
  }

  async forgotPassword(dto: ForgotPasswordDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (user) {
      const token = randomBytes(32).toString("hex");
      const tokenHash = await bcrypt.hash(token, 10);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { resetTokenHash: tokenHash, resetTokenExpiry: new Date(Date.now() + 30 * 60 * 1000) },
      });
      await this.audit.log({
        userId: user.id,
        action: "PASSWORD_RESET_REQUEST",
        entity: "User",
        entityId: user.id,
        ipAddress: ip,
        userAgent,
      });
      // In production, email the token. For this build it is returned once in the response.
      return { message: "If the email exists, a reset link has been sent.", resetToken: token };
    }
    return { message: "If the email exists, a reset link has been sent." };
  }

  async resetPassword(dto: ResetPasswordDto, ip?: string, userAgent?: string) {
    const users = await this.prisma.user.findMany({
      where: { resetTokenHash: { not: null } },
    });
    let matched: (typeof users)[number] | undefined;
    for (const u of users) {
      const ok = await bcrypt.compare(dto.token, u.resetTokenHash as string);
      if (ok) {
        matched = u;
        break;
      }
    }
    if (!matched || !matched.resetTokenExpiry || matched.resetTokenExpiry < new Date()) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    await this.prisma.user.update({
      where: { id: matched.id },
      data: {
        passwordHash: await bcrypt.hash(dto.newPassword, 10),
        resetTokenHash: null,
        resetTokenExpiry: null,
        refreshTokenHash: null,
      },
    });

    await this.audit.log({
      userId: matched.id,
      action: "PASSWORD_RESET",
      entity: "User",
      entityId: matched.id,
      ipAddress: ip,
      userAgent,
    });

    return { message: "Password reset successful. Please login." };
  }

  private async issueTokens(userId: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, type: "access" },
        { secret: process.env.JWT_ACCESS_SECRET!, expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? "15m") as any }
      ),
      this.jwtService.signAsync(
        { sub: userId, type: "refresh" },
        { secret: process.env.JWT_REFRESH_SECRET!, expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? "7d") as any }
      ),
    ]);
    return { accessToken, refreshToken };
  }
}
