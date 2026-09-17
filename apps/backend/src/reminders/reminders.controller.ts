import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { SupabaseAuthGuard, type AuthenticatedUser } from "../auth/supabase-auth.guard";
import { RemindersService } from "./reminders.service";
import { CreateReminderDto } from "./dto/create-reminder.dto";
import { UpdateReminderDto } from "./dto/update-reminder.dto";
import { ReminderDoneDto } from "./dto/reminder-done.dto";
import { CreateReminderItemDto } from "./dto/create-reminder-item.dto";
import { UpdateReminderItemDto } from "./dto/update-reminder-item.dto";

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller("reminders")
@UseGuards(SupabaseAuthGuard)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get()
  listReminders(@Req() request: AuthenticatedRequest) {
    return this.remindersService.listReminders(request.user.id);
  }

  @Post()
  createReminder(@Body() dto: CreateReminderDto, @Req() request: AuthenticatedRequest) {
    return this.remindersService.createReminder(request.user.id, dto);
  }

  @Patch(":id")
  updateReminder(@Param("id") id: string, @Body() dto: UpdateReminderDto, @Req() request: AuthenticatedRequest) {
    return this.remindersService.updateReminder(request.user.id, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  async deleteReminder(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    await this.remindersService.deleteReminder(request.user.id, id);
    return { success: true };
  }

  @Patch(":id/done")
  setDone(@Param("id") id: string, @Body() dto: ReminderDoneDto, @Req() request: AuthenticatedRequest) {
    return this.remindersService.setDone(request.user.id, id, dto);
  }

  @Post(":id/items")
  addItem(@Param("id") id: string, @Body() dto: CreateReminderItemDto, @Req() request: AuthenticatedRequest) {
    return this.remindersService.addItem(request.user.id, id, dto);
  }

  @Patch(":id/items/:itemId")
  updateItem(
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateReminderItemDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.remindersService.updateItem(request.user.id, id, itemId, dto);
  }

  @Delete(":id/items/:itemId")
  deleteItem(@Param("id") id: string, @Param("itemId") itemId: string, @Req() request: AuthenticatedRequest) {
    return this.remindersService.deleteItem(request.user.id, id, itemId);
  }
}
