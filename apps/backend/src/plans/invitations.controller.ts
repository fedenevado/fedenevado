import { Controller, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { SupabaseAuthGuard, type AuthenticatedUser } from "../auth/supabase-auth.guard";
import { PlansService } from "./plans.service";

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller("invitations")
@UseGuards(SupabaseAuthGuard)
export class InvitationsController {
  constructor(private readonly plansService: PlansService) {}

  @Post(":token/join")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  joinViaInvitation(@Param("token") token: string, @Req() request: AuthenticatedRequest) {
    return this.plansService.joinViaInvitationToken(request.user.id, token);
  }
}
