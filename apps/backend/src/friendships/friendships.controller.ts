import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { SupabaseAuthGuard, type AuthenticatedUser } from "../auth/supabase-auth.guard";
import { FriendshipsService } from "./friendships.service";
import { SendFriendRequestDto } from "./dto/send-friend-request.dto";
import { SearchFriendsDto } from "./dto/search-friends.dto";

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller("friendships")
@UseGuards(SupabaseAuthGuard)
export class FriendshipsController {
  constructor(private readonly friendshipsService: FriendshipsService) {}

  @Get()
  listFriends(@Req() request: AuthenticatedRequest) {
    return this.friendshipsService.listFriends(request.user.id);
  }

  @Get("requests")
  listPendingRequests(@Req() request: AuthenticatedRequest) {
    return this.friendshipsService.listPendingRequests(request.user.id);
  }

  @Get("search")
  searchUsers(@Query() query: SearchFriendsDto, @Req() request: AuthenticatedRequest) {
    return this.friendshipsService.searchUsers(request.user.id, query.q);
  }

  @Post()
  sendRequest(@Body() dto: SendFriendRequestDto, @Req() request: AuthenticatedRequest) {
    return this.friendshipsService.sendRequest(request.user.id, dto.addresseeId);
  }

  @Patch(":id/accept")
  @HttpCode(HttpStatus.OK)
  async acceptRequest(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    await this.friendshipsService.acceptRequest(request.user.id, id);
    return { success: true };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  async removeRequest(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    await this.friendshipsService.removeRequest(request.user.id, id);
    return { success: true };
  }
}
