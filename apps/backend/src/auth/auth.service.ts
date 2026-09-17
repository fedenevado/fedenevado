import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PrismaService } from "../prisma/prisma.service";
import { SUPABASE_ADMIN_CLIENT, SUPABASE_AUTH_CLIENT } from "../supabase/supabase.module";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { RefreshDto } from "./dto/refresh.dto";

const DEFAULT_RESET_PASSWORD_REDIRECT_URL = "mobile://reset-password";

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(SUPABASE_ADMIN_CLIENT) private readonly supabaseAdmin: SupabaseClient,
    @Inject(SUPABASE_AUTH_CLIENT) private readonly supabaseAuth: SupabaseClient,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const { data, error } = await this.supabaseAdmin.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
      user_metadata: { name: dto.name },
    });

    if (error || !data.user) {
      if (error?.status === 422 || error?.message?.toLowerCase().includes("already")) {
        throw new ConflictException("Ya existe una cuenta con ese email.");
      }
      throw new BadRequestException(error?.message ?? "No se pudo crear la cuenta.");
    }

    await this.prisma.user.create({
      data: {
        id: data.user.id,
        name: dto.name,
        email: dto.email,
        authProvider: "email",
      },
    });

    return this.signIn(dto.email, dto.password);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    return this.signIn(dto.email, dto.password);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ success: true }> {
    const redirectTo =
      this.config.get<string>("AUTH_RESET_PASSWORD_REDIRECT_URL") ?? DEFAULT_RESET_PASSWORD_REDIRECT_URL;
    // Se ignora deliberadamente el resultado: Supabase no revela si el email existe
    // (protección anti-enumeración) y la respuesta al cliente debe ser siempre la misma.
    await this.supabaseAuth.auth.resetPasswordForEmail(dto.email, { redirectTo });
    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<AuthResult> {
    const { data, error } = await this.supabaseAuth.auth.getUser(dto.accessToken);
    if (error || !data.user?.email) {
      throw new UnauthorizedException("El enlace no es válido o ha caducado.");
    }

    const { error: updateError } = await this.supabaseAdmin.auth.admin.updateUserById(data.user.id, {
      password: dto.newPassword,
    });
    if (updateError) {
      throw new BadRequestException(updateError.message ?? "No se pudo actualizar la contraseña.");
    }

    return this.signIn(data.user.email, dto.newPassword);
  }

  async refresh(dto: RefreshDto): Promise<RefreshResult> {
    const { data, error } = await this.supabaseAuth.auth.refreshSession({ refresh_token: dto.refreshToken });
    if (error || !data.session) {
      throw new UnauthorizedException("La sesión ha caducado. Inicia sesión de nuevo.");
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  }

  private async signIn(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await this.supabaseAuth.auth.signInWithPassword({ email, password });

    if (error || !data.session || !data.user) {
      throw new UnauthorizedException("Email o contraseña incorrectos.");
    }

    const user = await this.prisma.user.upsert({
      where: { id: data.user.id },
      update: {},
      create: {
        id: data.user.id,
        name: (data.user.user_metadata?.name as string | undefined) ?? email,
        email,
        authProvider: "email",
      },
    });

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: { id: user.id, name: user.name, email: user.email },
    };
  }
}
