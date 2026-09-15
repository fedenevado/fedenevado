import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { SupabaseAuthGuard, type AuthenticatedUser } from "../auth/supabase-auth.guard";
import { ChatService } from "./chat.service";
import { CreateMessageDto } from "./dto/create-message.dto";

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller("plans/:planId/messages")
@UseGuards(SupabaseAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  listMessages(@Param("planId") planId: string, @Req() request: AuthenticatedRequest) {
    return this.chatService.listMessages(request.user.id, planId);
  }

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  sendMessage(
    @Param("planId") planId: string,
    @Body() dto: CreateMessageDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.chatService.sendMessage(request.user.id, planId, dto);
  }
}
