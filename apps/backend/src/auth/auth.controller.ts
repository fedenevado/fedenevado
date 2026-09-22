import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { UsernameSuggestionDto } from "./dto/username-suggestion.dto";
import { UsernameAvailabilityDto } from "./dto/username-availability.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("username-suggestion")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  suggestUsername(@Query() query: UsernameSuggestionDto) {
    return this.authService.suggestUsername(query.name);
  }

  @Get("username-availability")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  checkUsernameAvailability(@Query() query: UsernameAvailabilityDto) {
    return this.authService.checkUsernameAvailability(query.username);
  }

  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
  }
}
