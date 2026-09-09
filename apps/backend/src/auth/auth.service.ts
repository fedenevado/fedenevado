import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PrismaService } from "../prisma/prisma.service";
import { SUPABASE_ADMIN_CLIENT, SUPABASE_AUTH_CLIENT } from "../supabase/supabase.module";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

export interface AuthResult {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(SUPABASE_ADMIN_CLIENT) private readonly supabaseAdmin: SupabaseClient,
    @Inject(SUPABASE_AUTH_CLIENT) private readonly supabaseAuth: SupabaseClient,
    private readonly prisma: PrismaService,
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
      user: { id: user.id, name: user.name, email: user.email },
    };
  }
}
