import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { SupabaseAuthGuard, type AuthenticatedUser } from "../auth/supabase-auth.guard";
import { PlansService } from "./plans.service";
import { CreatePlanDto } from "./dto/create-plan.dto";
import { UpdatePlanDto } from "./dto/update-plan.dto";
import { RsvpDto } from "./dto/rsvp.dto";

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller("plans")
@UseGuards(SupabaseAuthGuard)
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  listPlans(@Req() request: AuthenticatedRequest) {
    return this.plansService.listPlans(request.user.id);
  }

  @Get(":id")
  getPlan(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return this.plansService.getPlan(request.user.id, id);
  }

  @Post()
  createPlan(@Body() dto: CreatePlanDto, @Req() request: AuthenticatedRequest) {
    return this.plansService.createPlan(request.user.id, dto);
  }

  @Patch(":id")
  updatePlan(@Param("id") id: string, @Body() dto: UpdatePlanDto, @Req() request: AuthenticatedRequest) {
    return this.plansService.updatePlan(request.user.id, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  async deletePlan(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    await this.plansService.deletePlan(request.user.id, id);
    return { success: true };
  }

  @Patch(":id/rsvp")
  setRsvp(@Param("id") id: string, @Body() dto: RsvpDto, @Req() request: AuthenticatedRequest) {
    return this.plansService.setRsvp(request.user.id, id, dto.status);
  }

  @Post(":id/invitation")
  getOrCreateInvitation(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return this.plansService.getOrCreateInvitation(request.user.id, id);
  }

  @Get(":id/join-requests")
  listJoinRequests(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return this.plansService.listJoinRequests(request.user.id, id);
  }

  @Patch(":id/join-requests/:requestId/approve")
  @HttpCode(HttpStatus.OK)
  async approveJoinRequest(
    @Param("id") id: string,
    @Param("requestId") requestId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.plansService.approveJoinRequest(request.user.id, id, requestId);
    return { success: true };
  }

  @Patch(":id/join-requests/:requestId/reject")
  @HttpCode(HttpStatus.OK)
  async rejectJoinRequest(
    @Param("id") id: string,
    @Param("requestId") requestId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.plansService.rejectJoinRequest(request.user.id, id, requestId);
    return { success: true };
  }
}
