import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateListDto } from "./dto/create-list.dto";
import { CreateListItemDto } from "./dto/create-list-item.dto";
import { UpdateListItemDto } from "./dto/update-list-item.dto";

export interface ListItemSummary {
  id: string;
  text: string;
  done: boolean;
}

export interface ListSummary {
  id: string;
  title: string;
  templateId: string | null;
  items: ListItemSummary[];
}

const PLAN_INCLUDE = {
  participants: true,
} satisfies Prisma.PlanInclude;

type PlanWithParticipants = Prisma.PlanGetPayload<{ include: typeof PLAN_INCLUDE }>;

const LIST_INCLUDE = {
  items: { orderBy: { order: "asc" } },
} satisfies Prisma.ListInclude;

type ListWithItems = Prisma.ListGetPayload<{ include: typeof LIST_INCLUDE }>;

function toListSummary(list: ListWithItems): ListSummary {
  return {
    id: list.id,
    title: list.title,
    templateId: list.templateId,
    items: list.items.map((it) => ({ id: it.id, text: it.text, done: it.done })),
  };
}

@Injectable()
export class ListsService {
  constructor(private readonly prisma: PrismaService) {}

  private async loadPlan(planId: string, userId: string): Promise<PlanWithParticipants> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: PLAN_INCLUDE,
    });
    if (!plan || !plan.participants.some((p) => p.userId === userId)) {
      throw new NotFoundException("Plan no encontrado.");
    }
    return plan;
  }

  private assertConfirmed(plan: PlanWithParticipants, userId: string): void {
    const isConfirmed = plan.participants.some((p) => p.userId === userId && p.rsvpStatus === "yes");
    if (!isConfirmed) {
      throw new ForbiddenException("Solo los participantes confirmados pueden gestionar las listas.");
    }
  }

  private async loadList(planId: string, listId: string): Promise<ListWithItems> {
    const list = await this.prisma.list.findUnique({
      where: { id: listId },
      include: LIST_INCLUDE,
    });
    if (!list || list.planId !== planId) {
      throw new NotFoundException("Lista no encontrada.");
    }
    return list;
  }

  async listLists(userId: string, planId: string): Promise<ListSummary[]> {
    await this.loadPlan(planId, userId);
    const lists = await this.prisma.list.findMany({
      where: { planId },
      include: LIST_INCLUDE,
      orderBy: { createdAt: "asc" },
    });
    return lists.map(toListSummary);
  }

  async createList(userId: string, planId: string, dto: CreateListDto): Promise<ListSummary> {
    const plan = await this.loadPlan(planId, userId);
    this.assertConfirmed(plan, userId);

    if (dto.templateId) {
      const template = await this.prisma.listTemplate.findUnique({
        where: { id: dto.templateId },
        include: { items: { orderBy: { order: "asc" } } },
      });
      if (!template || template.userId !== userId) {
        throw new NotFoundException("Plantilla no encontrada.");
      }
      const list = await this.prisma.list.create({
        data: {
          planId,
          title: template.title,
          templateId: template.id,
          items: {
            create: template.items.map((it, order) => ({ text: it.text, done: false, order })),
          },
        },
        include: LIST_INCLUDE,
      });
      return toListSummary(list);
    }

    if (!dto.title?.trim()) {
      throw new BadRequestException("Escribe un título para la lista o elige una plantilla.");
    }

    const list = await this.prisma.list.create({
      data: { planId, title: dto.title },
      include: LIST_INCLUDE,
    });
    return toListSummary(list);
  }

  async deleteList(userId: string, planId: string, listId: string): Promise<void> {
    const plan = await this.loadPlan(planId, userId);
    this.assertConfirmed(plan, userId);
    await this.loadList(planId, listId);
    await this.prisma.list.delete({ where: { id: listId } });
  }

  async addItem(userId: string, planId: string, listId: string, dto: CreateListItemDto): Promise<ListSummary> {
    const plan = await this.loadPlan(planId, userId);
    this.assertConfirmed(plan, userId);
    const list = await this.loadList(planId, listId);

    const nextOrder = list.items.length > 0 ? Math.max(...list.items.map((it) => it.order)) + 1 : 0;
    await this.prisma.listItem.create({
      data: { listId, text: dto.text, order: nextOrder },
    });
    return toListSummary(await this.loadList(planId, listId));
  }

  async updateItem(
    userId: string,
    planId: string,
    listId: string,
    itemId: string,
    dto: UpdateListItemDto,
  ): Promise<ListSummary> {
    const plan = await this.loadPlan(planId, userId);
    this.assertConfirmed(plan, userId);
    await this.loadList(planId, listId);

    const item = await this.prisma.listItem.findUnique({ where: { id: itemId } });
    if (!item || item.listId !== listId) {
      throw new NotFoundException("Elemento no encontrado.");
    }

    await this.prisma.listItem.update({ where: { id: itemId }, data: { done: dto.done } });
    return toListSummary(await this.loadList(planId, listId));
  }

  async deleteItem(userId: string, planId: string, listId: string, itemId: string): Promise<ListSummary> {
    const plan = await this.loadPlan(planId, userId);
    this.assertConfirmed(plan, userId);
    await this.loadList(planId, listId);

    const item = await this.prisma.listItem.findUnique({ where: { id: itemId } });
    if (!item || item.listId !== listId) {
      throw new NotFoundException("Elemento no encontrado.");
    }

    await this.prisma.listItem.delete({ where: { id: itemId } });
    return toListSummary(await this.loadList(planId, listId));
  }

  // Icono de marcador en la lista: guardarla como plantilla nueva (snapshot
  // de sus elementos actuales) o, si ya estaba guardada, dejar de estarlo
  // (borra la plantilla y desenlaza la lista, que sigue existiendo igual).
  async saveAsTemplate(userId: string, planId: string, listId: string): Promise<ListSummary> {
    const plan = await this.loadPlan(planId, userId);
    this.assertConfirmed(plan, userId);
    const list = await this.loadList(planId, listId);

    if (list.templateId) {
      throw new BadRequestException("Esta lista ya está guardada como plantilla.");
    }

    await this.prisma.$transaction(async (tx) => {
      const template = await tx.listTemplate.create({
        data: {
          userId,
          title: list.title,
          items: { create: list.items.map((it, order) => ({ text: it.text, order })) },
        },
      });
      await tx.list.update({ where: { id: listId }, data: { templateId: template.id } });
    });

    return toListSummary(await this.loadList(planId, listId));
  }

  async unsaveTemplate(userId: string, planId: string, listId: string): Promise<ListSummary> {
    const plan = await this.loadPlan(planId, userId);
    this.assertConfirmed(plan, userId);
    const list = await this.loadList(planId, listId);

    if (!list.templateId) {
      throw new BadRequestException("Esta lista no está guardada como plantilla.");
    }

    const templateId = list.templateId;
    const template = await this.prisma.listTemplate.findUnique({ where: { id: templateId } });
    if (template && template.userId !== userId) {
      // La plantilla es de otro participante del plan: cada quien gestiona
      // solo sus propias plantillas, aunque la lista se comparta.
      throw new ForbiddenException("Esta lista está guardada como plantilla de otra persona.");
    }

    await this.prisma.$transaction([
      this.prisma.list.update({ where: { id: listId }, data: { templateId: null } }),
      this.prisma.listTemplate.delete({ where: { id: templateId } }),
    ]);

    return toListSummary(await this.loadList(planId, listId));
  }
}
