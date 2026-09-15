import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateMessageDto } from "./dto/create-message.dto";

export interface MessageSummary {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

const PLAN_INCLUDE = {
  participants: true,
} satisfies Prisma.PlanInclude;

type PlanWithParticipants = Prisma.PlanGetPayload<{ include: typeof PLAN_INCLUDE }>;

const MESSAGE_INCLUDE = {
  sender: true,
} satisfies Prisma.MessageInclude;

type MessageWithSender = Prisma.MessageGetPayload<{ include: typeof MESSAGE_INCLUDE }>;

function toMessageSummary(message: MessageWithSender): MessageSummary {
  return {
    id: message.id,
    senderId: message.senderId,
    senderName: message.sender.name,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };
}

@Injectable()
export class ChatService {
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
      throw new ForbiddenException("Solo los participantes confirmados pueden escribir en el chat.");
    }
  }

  async listMessages(userId: string, planId: string): Promise<MessageSummary[]> {
    await this.loadPlan(planId, userId);
    const messages = await this.prisma.message.findMany({
      where: { planId },
      include: MESSAGE_INCLUDE,
      orderBy: { createdAt: "asc" },
    });
    return messages.map(toMessageSummary);
  }

  async sendMessage(userId: string, planId: string, dto: CreateMessageDto): Promise<MessageSummary> {
    const plan = await this.loadPlan(planId, userId);
    this.assertConfirmed(plan, userId);

    const content = dto.content.trim();
    if (!content) {
      throw new BadRequestException("Escribe un mensaje.");
    }

    const message = await this.prisma.message.create({
      data: { planId, senderId: userId, content },
      include: MESSAGE_INCLUDE,
    });
    return toMessageSummary(message);
  }
}
