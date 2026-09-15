import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { SupabaseAuthGuard, type AuthenticatedUser } from "../auth/supabase-auth.guard";
import { ListTemplatesService } from "./list-templates.service";
import { CreateListTemplateDto } from "./dto/create-list-template.dto";
import { UpdateListTemplateDto } from "./dto/update-list-template.dto";

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller("list-templates")
@UseGuards(SupabaseAuthGuard)
export class ListTemplatesController {
  constructor(private readonly listTemplatesService: ListTemplatesService) {}

  @Get()
  listTemplates(@Req() request: AuthenticatedRequest) {
    return this.listTemplatesService.listTemplates(request.user.id);
  }

  @Post()
  createTemplate(@Body() dto: CreateListTemplateDto, @Req() request: AuthenticatedRequest) {
    return this.listTemplatesService.createTemplate(request.user.id, dto);
  }

  @Patch(":templateId")
  updateTemplate(
    @Param("templateId") templateId: string,
    @Body() dto: UpdateListTemplateDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.listTemplatesService.updateTemplate(request.user.id, templateId, dto);
  }

  @Delete(":templateId")
  async deleteTemplate(@Param("templateId") templateId: string, @Req() request: AuthenticatedRequest) {
    await this.listTemplatesService.deleteTemplate(request.user.id, templateId);
    return { success: true };
  }
}
