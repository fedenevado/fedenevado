import { Controller, Get, HttpCode, HttpStatus, Param, Patch, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { SupabaseAuthGuard, type AuthenticatedUser } from "../auth/supabase-auth.guard";
import { NotificationsService } from "./notifications.service";

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller("notifications")
@UseGuards(SupabaseAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  listNotifications(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.listNotifications(request.user.id);
  }

  @Patch(":id/read")
  @HttpCode(HttpStatus.OK)
  async markRead(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    await this.notificationsService.markRead(request.user.id, id);
    return { success: true };
  }

  @Patch("read-all")
  @HttpCode(HttpStatus.OK)
  async markAllRead(@Req() request: AuthenticatedRequest) {
    await this.notificationsService.markAllRead(request.user.id);
    return { success: true };
  }
}
