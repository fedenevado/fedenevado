import { Controller, Get, NotFoundException, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { SupabaseAuthGuard, type AuthenticatedUser } from "../auth/supabase-auth.guard";

@Controller("users")
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("me")
  @UseGuards(SupabaseAuthGuard)
  async me(@Req() request: Request & { user: AuthenticatedUser }) {
    const user = await this.prisma.user.findUnique({ where: { id: request.user.id } });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado.");
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
    };
  }
}
