import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateReminderDto } from "./dto/create-reminder.dto";
import { UpdateReminderDto } from "./dto/update-reminder.dto";
import { ReminderDoneDto } from "./dto/reminder-done.dto";
import { CreateReminderItemDto } from "./dto/create-reminder-item.dto";
import { UpdateReminderItemDto } from "./dto/update-reminder-item.dto";

export interface ReminderShareSummary {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

export interface ReminderItemSummary {
  id: string;
  text: string;
  done: boolean;
}

export interface ReminderSummary {
  id: string;
  ownerId: string;
  ownerName: string;
  date: string;
  title: string;
  time: string | null;
  done: boolean;
  sharedWith: ReminderShareSummary[];
  items: ReminderItemSummary[];
}

const REMINDER_INCLUDE = {
  owner: true,
  sharedWith: { include: { user: true } },
  items: { orderBy: { order: "asc" } },
} satisfies Prisma.ReminderInclude;

type ReminderWithRelations = Prisma.ReminderGetPayload<{ include: typeof REMINDER_INCLUDE }>;

function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toSummary(reminder: ReminderWithRelations): ReminderSummary {
  return {
    id: reminder.id,
    ownerId: reminder.ownerId,
    ownerName: reminder.owner.name,
    date: formatDate(reminder.date),
    title: reminder.title,
    time: reminder.time,
    done: reminder.done,
    sharedWith: reminder.sharedWith.map((s) => ({
      userId: s.userId,
      name: s.user.name,
      avatarUrl: s.user.avatarUrl,
    })),
    items: reminder.items.map((it) => ({ id: it.id, text: it.text, done: it.done })),
  };
}

@Injectable()
export class RemindersService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertFriends(userId: string, friendIds: string[]): Promise<void> {
    if (friendIds.length === 0) {
      return;
    }
    const accepted = await this.prisma.friendship.findMany({
      where: {
        status: "accepted",
        OR: [
          { requesterId: userId, addresseeId: { in: friendIds } },
          { addresseeId: userId, requesterId: { in: friendIds } },
        ],
      },
    });
    const acceptedIds = new Set(
      accepted.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId)),
    );
    const invalid = friendIds.filter((id) => !acceptedIds.has(id));
    if (invalid.length > 0) {
      throw new ForbiddenException("Solo puedes compartir tareas de ruta con amigos existentes.");
    }
  }

  // Ve la tarea quien es su propietario o quien está en sharedWith. A
  // cualquier otra persona se le devuelve 404 (no 403) para no revelar que
  // la tarea existe, mismo criterio que PlansService con los planes.
  private async loadReminder(userId: string, reminderId: string): Promise<ReminderWithRelations> {
    const reminder = await this.prisma.reminder.findUnique({
      where: { id: reminderId },
      include: REMINDER_INCLUDE,
    });
    const hasAccess =
      reminder && (reminder.ownerId === userId || reminder.sharedWith.some((s) => s.userId === userId));
    if (!reminder || !hasAccess) {
      throw new NotFoundException("Tarea de ruta no encontrada.");
    }
    return reminder;
  }

  private assertOwner(reminder: ReminderWithRelations, userId: string): void {
    if (reminder.ownerId !== userId) {
      throw new ForbiddenException("Solo quien creó la tarea de ruta puede editarla.");
    }
  }

  async listReminders(userId: string): Promise<ReminderSummary[]> {
    const reminders = await this.prisma.reminder.findMany({
      where: { OR: [{ ownerId: userId }, { sharedWith: { some: { userId } } }] },
      include: REMINDER_INCLUDE,
      orderBy: [{ date: "asc" }, { time: "asc" }],
    });
    return reminders.map(toSummary);
  }

  async createReminder(userId: string, dto: CreateReminderDto): Promise<ReminderSummary> {
    const sharedWith = dto.sharedWith ?? [];
    await this.assertFriends(userId, sharedWith);

    const reminder = await this.prisma.reminder.create({
      data: {
        ownerId: userId,
        date: toDateOnly(dto.date),
        title: dto.title,
        time: dto.time ?? null,
        sharedWith: { create: sharedWith.map((id) => ({ userId: id })) },
        items: {
          create: (dto.items ?? []).map((text, order) => ({ text, order })),
        },
      },
      include: REMINDER_INCLUDE,
    });

    return toSummary(reminder);
  }

  async updateReminder(userId: string, reminderId: string, dto: UpdateReminderDto): Promise<ReminderSummary> {
    const existing = await this.loadReminder(userId, reminderId);
    this.assertOwner(existing, userId);

    if (dto.sharedWith) {
      await this.assertFriends(userId, dto.sharedWith);
      const currentIds = new Set(existing.sharedWith.map((s) => s.userId));
      const nextIds = new Set(dto.sharedWith);

      const toRemove = existing.sharedWith.filter((s) => !nextIds.has(s.userId));
      const toAdd = dto.sharedWith.filter((id) => !currentIds.has(id));

      if (toRemove.length > 0) {
        await this.prisma.reminderShare.deleteMany({
          where: { id: { in: toRemove.map((s) => s.id) } },
        });
      }
      if (toAdd.length > 0) {
        await this.prisma.reminderShare.createMany({
          data: toAdd.map((id) => ({ reminderId, userId: id })),
        });
      }
    }

    await this.prisma.reminder.update({
      where: { id: reminderId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.date !== undefined ? { date: toDateOnly(dto.date) } : {}),
        ...(dto.time !== undefined ? { time: dto.time } : {}),
      },
    });

    return toSummary(await this.loadReminder(userId, reminderId));
  }

  async deleteReminder(userId: string, reminderId: string): Promise<void> {
    const existing = await this.loadReminder(userId, reminderId);
    this.assertOwner(existing, userId);
    await this.prisma.reminder.delete({ where: { id: reminderId } });
  }

  // Marcar hecha/pendiente es una acción colaborativa: el propietario y
  // cualquier persona con quien se comparte pueden hacerlo (misma checklist
  // para todos), a diferencia de editar título/fecha/hora o gestionar con
  // quién se comparte, que son solo del propietario.
  async setDone(userId: string, reminderId: string, dto: ReminderDoneDto): Promise<ReminderSummary> {
    await this.loadReminder(userId, reminderId);
    await this.prisma.reminder.update({ where: { id: reminderId }, data: { done: dto.done } });
    return toSummary(await this.loadReminder(userId, reminderId));
  }

  async addItem(userId: string, reminderId: string, dto: CreateReminderItemDto): Promise<ReminderSummary> {
    const reminder = await this.loadReminder(userId, reminderId);
    const nextOrder = reminder.items.length > 0 ? Math.max(...reminder.items.map((it) => it.order)) + 1 : 0;
    await this.prisma.reminderItem.create({
      data: { reminderId, text: dto.text, order: nextOrder },
    });
    return toSummary(await this.loadReminder(userId, reminderId));
  }

  async updateItem(
    userId: string,
    reminderId: string,
    itemId: string,
    dto: UpdateReminderItemDto,
  ): Promise<ReminderSummary> {
    await this.loadReminder(userId, reminderId);
    const item = await this.prisma.reminderItem.findUnique({ where: { id: itemId } });
    if (!item || item.reminderId !== reminderId) {
      throw new NotFoundException("Elemento no encontrado.");
    }
    await this.prisma.reminderItem.update({ where: { id: itemId }, data: { done: dto.done } });
    return toSummary(await this.loadReminder(userId, reminderId));
  }

  async deleteItem(userId: string, reminderId: string, itemId: string): Promise<ReminderSummary> {
    await this.loadReminder(userId, reminderId);
    const item = await this.prisma.reminderItem.findUnique({ where: { id: itemId } });
    if (!item || item.reminderId !== reminderId) {
      throw new NotFoundException("Elemento no encontrado.");
    }
    await this.prisma.reminderItem.delete({ where: { id: itemId } });
    return toSummary(await this.loadReminder(userId, reminderId));
  }
}
