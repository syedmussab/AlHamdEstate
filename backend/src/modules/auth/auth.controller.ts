import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
} from "./dto/auth.dto";

@Controller("api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  register(@Body() dto: RegisterDto, @Ip() ip: string, @Req() req: any) {
    return this.authService.register(dto, ip, req.headers["user-agent"]);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("login")
  login(@Body() dto: LoginDto, @Ip() ip: string, @Req() req: any) {
    return this.authService.login(dto, ip, req.headers["user-agent"]);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("refresh")
  refresh(@Body() dto: RefreshTokenDto, @Ip() ip: string, @Req() req: any) {
    return this.authService.refresh(dto, ip, req.headers["user-agent"]);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post("logout")
  logout(@CurrentUser("id") userId: string) {
    return this.authService.logout(userId);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("forgot-password")
  forgotPassword(@Body() dto: ForgotPasswordDto, @Ip() ip: string, @Req() req: any) {
    return this.authService.forgotPassword(dto, ip, req.headers["user-agent"]);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("reset-password")
  resetPassword(@Body() dto: ResetPasswordDto, @Ip() ip: string, @Req() req: any) {
    return this.authService.resetPassword(dto, ip, req.headers["user-agent"]);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser("id") userId: string) {
    return this.authService.me(userId);
  }
}
