import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateListTemplateDto } from "./dto/create-list-template.dto";
import { UpdateListTemplateDto } from "./dto/update-list-template.dto";

export interface ListTemplateSummary {
  id: string;
  title: string;
  items: string[];
}

@Injectable()
export class ListTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  private async loadOwnTemplate(userId: string, templateId: string) {
    const template = await this.prisma.listTemplate.findUnique({
      where: { id: templateId },
      include: { items: { orderBy: { order: "asc" } } },
    });
    if (!template || template.userId !== userId) {
      throw new NotFoundException("Plantilla no encontrada.");
    }
    return template;
  }

  private toSummary(template: { id: string; title: string; items: { text: string }[] }): ListTemplateSummary {
    return {
      id: template.id,
      title: template.title,
      items: template.items.map((it) => it.text),
    };
  }

  async listTemplates(userId: string): Promise<ListTemplateSummary[]> {
    const templates = await this.prisma.listTemplate.findMany({
      where: { userId },
      include: { items: { orderBy: { order: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    return templates.map((t) => this.toSummary(t));
  }

  async createTemplate(userId: string, dto: CreateListTemplateDto): Promise<ListTemplateSummary> {
    const template = await this.prisma.listTemplate.create({
      data: {
        userId,
        title: dto.title,
        items: {
          create: dto.items.map((text, order) => ({ text, order })),
        },
      },
      include: { items: { orderBy: { order: "asc" } } },
    });
    return this.toSummary(template);
  }

  async updateTemplate(userId: string, templateId: string, dto: UpdateListTemplateDto): Promise<ListTemplateSummary> {
    const existing = await this.loadOwnTemplate(userId, templateId);

    if (dto.items) {
      await this.prisma.listTemplateItem.deleteMany({ where: { templateId } });
    }

    const template = await this.prisma.listTemplate.update({
      where: { id: templateId },
      data: {
        title: dto.title ?? existing.title,
        ...(dto.items
          ? { items: { create: dto.items.map((text, order) => ({ text, order })) } }
          : {}),
      },
      include: { items: { orderBy: { order: "asc" } } },
    });
    return this.toSummary(template);
  }

  async deleteTemplate(userId: string, templateId: string): Promise<void> {
    await this.loadOwnTemplate(userId, templateId);
    // Las listas ya creadas a partir de esta plantilla no se borran ni se
    // ven afectadas: solo se desenlazan (comportamiento del prototipo).
    await this.prisma.$transaction([
      this.prisma.list.updateMany({ where: { templateId }, data: { templateId: null } }),
      this.prisma.listTemplate.delete({ where: { id: templateId } }),
    ]);
  }
}
