import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePlanDto } from "./dto/create-plan.dto";
import { UpdatePlanDto } from "./dto/update-plan.dto";
import { RsvpStatusDto } from "./dto/rsvp.dto";

export interface PlanParticipantSummary {
  id: string;
  userId: string | null;
  name: string;
  avatarUrl: string | null;
  role: string;
  rsvpStatus: string;
}

export interface PlanSummary {
  id: string;
  ownerId: string;
  title: string;
  type: string;
  startDate: string;
  endDate: string | null;
  time: string | null;
  location: string | null;
  participants: PlanParticipantSummary[];
}

const PLAN_INCLUDE = {
  participants: { include: { user: true } },
} satisfies Prisma.PlanInclude;

type PlanWithParticipants = Prisma.PlanGetPayload<{ include: typeof PLAN_INCLUDE }>;

function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toSummary(plan: PlanWithParticipants): PlanSummary {
  return {
    id: plan.id,
    ownerId: plan.ownerId,
    title: plan.title,
    type: plan.type,
    startDate: formatDate(plan.startDate),
    endDate: plan.endDate ? formatDate(plan.endDate) : null,
    time: plan.time,
    location: plan.location,
    participants: plan.participants.map((p) => ({
      id: p.id,
      userId: p.userId,
      name: p.user?.name ?? p.guestName ?? "",
      avatarUrl: p.user?.avatarUrl ?? null,
      role: p.role,
      rsvpStatus: p.rsvpStatus,
    })),
  };
}

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async listPlans(userId: string): Promise<PlanSummary[]> {
    const plans = await this.prisma.plan.findMany({
      where: { participants: { some: { userId } } },
      include: PLAN_INCLUDE,
      orderBy: { startDate: "asc" },
    });

    return plans.map(toSummary);
  }

  async getPlan(userId: string, planId: string): Promise<PlanSummary> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: PLAN_INCLUDE,
    });

    if (!plan || !plan.participants.some((p) => p.userId === userId)) {
      throw new NotFoundException("Plan no encontrado.");
    }

    return toSummary(plan);
  }

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
      throw new ForbiddenException("Solo puedes invitar a amigos existentes.");
    }
  }

  private normalizeByType(dto: {
    type?: string;
    endDate?: string;
    time?: string;
  }): { endDate?: string; time?: string } {
    const endDate = dto.type === "viaje" ? dto.endDate : undefined;
    const time = dto.type === "comida" || dto.type === "evento" ? dto.time : undefined;
    return { endDate, time };
  }

  async createPlan(userId: string, dto: CreatePlanDto): Promise<PlanSummary> {
    const friendIds = dto.invitedFriendIds ?? [];
    await this.assertFriends(userId, friendIds);

    const { endDate, time } = this.normalizeByType(dto);

    const plan = await this.prisma.plan.create({
      data: {
        ownerId: userId,
        title: dto.title,
        type: dto.type,
        startDate: toDateOnly(dto.startDate),
        endDate: endDate ? toDateOnly(endDate) : null,
        time: time ?? null,
        location: dto.location ?? null,
        participants: {
          create: [
            { userId, role: "owner", rsvpStatus: "yes" },
            ...friendIds.map((id) => ({ userId: id, role: "guest" as const, rsvpStatus: "pending" as const })),
          ],
        },
      },
      include: PLAN_INCLUDE,
    });

    return toSummary(plan);
  }

  async updatePlan(userId: string, planId: string, dto: UpdatePlanDto): Promise<PlanSummary> {
    const existing = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: PLAN_INCLUDE,
    });
    if (!existing) {
      throw new NotFoundException("Plan no encontrado.");
    }
    if (existing.ownerId !== userId) {
      throw new ForbiddenException("Solo el propietario puede editar este plan.");
    }

    const friendIds = dto.invitedFriendIds;
    if (friendIds) {
      await this.assertFriends(userId, friendIds);
    }

    const type = dto.type ?? existing.type;
    const { endDate, time } = this.normalizeByType({
      type,
      endDate: dto.endDate,
      time: dto.time,
    });

    await this.prisma.plan.update({
      where: { id: planId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.startDate !== undefined ? { startDate: toDateOnly(dto.startDate) } : {}),
        ...(dto.type !== undefined || dto.endDate !== undefined
          ? { endDate: endDate ? toDateOnly(endDate) : null }
          : {}),
        ...(dto.type !== undefined || dto.time !== undefined ? { time: time ?? null } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
      },
    });

    if (friendIds) {
      const current = existing.participants;
      const currentFriendIds = new Set(
        current.filter((p) => p.userId && p.userId !== userId).map((p) => p.userId as string),
      );
      const nextFriendIds = new Set(friendIds);

      const toRemove = current.filter(
        (p) => p.userId && p.userId !== userId && !nextFriendIds.has(p.userId),
      );
      const toAdd = friendIds.filter((id) => !currentFriendIds.has(id));

      if (toRemove.length > 0) {
        await this.prisma.planParticipant.deleteMany({
          where: { id: { in: toRemove.map((p) => p.id) } },
        });
      }
      if (toAdd.length > 0) {
        await this.prisma.planParticipant.createMany({
          data: toAdd.map((id) => ({ planId, userId: id, role: "guest", rsvpStatus: "pending" })),
        });
      }
    }

    return this.getPlan(userId, planId);
  }

  async deletePlan(userId: string, planId: string): Promise<void> {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException("Plan no encontrado.");
    }
    if (plan.ownerId !== userId) {
      throw new ForbiddenException("Solo el propietario puede eliminar este plan.");
    }
    await this.prisma.plan.delete({ where: { id: planId } });
  }

  async setRsvp(userId: string, planId: string, status: RsvpStatusDto): Promise<PlanSummary> {
    const participant = await this.prisma.planParticipant.findFirst({
      where: { planId, userId },
    });
    if (!participant) {
      throw new ForbiddenException("No eres participante de este plan.");
    }

    await this.prisma.planParticipant.update({
      where: { id: participant.id },
      data: { rsvpStatus: status },
    });

    return this.getPlan(userId, planId);
  }
}
