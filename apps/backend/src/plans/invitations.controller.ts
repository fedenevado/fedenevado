import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { SupabaseAuthGuard, type AuthenticatedUser } from "../auth/supabase-auth.guard";
import { PlansService } from "./plans.service";
import { JoinAsGuestDto } from "./dto/join-as-guest.dto";

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller("invitations")
export class InvitationsController {
  constructor(private readonly plansService: PlansService) {}

  // Sin cuenta: vista previa de un plan a partir del enlace de invitación.
  @Get(":token/preview")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  previewInvitation(@Param("token") token: string) {
    return this.plansService.previewInvitation(token);
  }

  // Sin cuenta: unirse (o solicitar unirse, si el plan es privado) dando solo un nombre.
  @Post(":token/guest-join")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  joinAsGuest(@Param("token") token: string, @Body() dto: JoinAsGuestDto) {
    return this.plansService.joinAsGuest(token, dto.guestName);
  }

  @Post(":token/join")
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  joinViaInvitation(@Param("token") token: string, @Req() request: AuthenticatedRequest) {
    return this.plansService.joinViaInvitationToken(request.user.id, token);
  }
}
