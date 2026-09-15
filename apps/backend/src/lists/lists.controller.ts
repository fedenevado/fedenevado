import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { SupabaseAuthGuard, type AuthenticatedUser } from "../auth/supabase-auth.guard";
import { ListsService } from "./lists.service";
import { CreateListDto } from "./dto/create-list.dto";
import { CreateListItemDto } from "./dto/create-list-item.dto";
import { UpdateListItemDto } from "./dto/update-list-item.dto";

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller("plans/:planId/lists")
@UseGuards(SupabaseAuthGuard)
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  @Get()
  listLists(@Param("planId") planId: string, @Req() request: AuthenticatedRequest) {
    return this.listsService.listLists(request.user.id, planId);
  }

  @Post()
  createList(@Param("planId") planId: string, @Body() dto: CreateListDto, @Req() request: AuthenticatedRequest) {
    return this.listsService.createList(request.user.id, planId, dto);
  }

  @Delete(":listId")
  async deleteList(
    @Param("planId") planId: string,
    @Param("listId") listId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.listsService.deleteList(request.user.id, planId, listId);
    return { success: true };
  }

  @Post(":listId/items")
  addItem(
    @Param("planId") planId: string,
    @Param("listId") listId: string,
    @Body() dto: CreateListItemDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.listsService.addItem(request.user.id, planId, listId, dto);
  }

  @Patch(":listId/items/:itemId")
  updateItem(
    @Param("planId") planId: string,
    @Param("listId") listId: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateListItemDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.listsService.updateItem(request.user.id, planId, listId, itemId, dto);
  }

  @Delete(":listId/items/:itemId")
  deleteItem(
    @Param("planId") planId: string,
    @Param("listId") listId: string,
    @Param("itemId") itemId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.listsService.deleteItem(request.user.id, planId, listId, itemId);
  }

  @Post(":listId/template")
  saveAsTemplate(
    @Param("planId") planId: string,
    @Param("listId") listId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.listsService.saveAsTemplate(request.user.id, planId, listId);
  }

  @Delete(":listId/template")
  unsaveTemplate(
    @Param("planId") planId: string,
    @Param("listId") listId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.listsService.unsaveTemplate(request.user.id, planId, listId);
  }
}
