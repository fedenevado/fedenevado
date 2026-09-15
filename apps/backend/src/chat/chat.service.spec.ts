import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { ChatService } from "./chat.service";

function participant(userId: string, rsvpStatus = "yes") {
  return { id: `pp-${userId}`, userId, rsvpStatus };
}

function samplePlan(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "plan-1",
    participants: [participant("owner"), participant("user-2", "pending")],
    ...overrides,
  };
}

function sampleMessage(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "msg-1",
    senderId: "owner",
    content: "Hola",
    createdAt: new Date("2026-09-14T12:00:00Z"),
    sender: { name: "Ana" },
    ...overrides,
  };
}

function buildService(overrides: {
  planFindUnique?: jest.Mock;
  messageFindMany?: jest.Mock;
  messageCreate?: jest.Mock;
}) {
  const prisma: any = {
    plan: { findUnique: overrides.planFindUnique ?? jest.fn().mockResolvedValue(samplePlan()) },
    message: {
      findMany: overrides.messageFindMany ?? jest.fn().mockResolvedValue([]),
      create: overrides.messageCreate ?? jest.fn().mockResolvedValue(sampleMessage()),
    },
  };
  return { service: new ChatService(prisma), prisma };
}

describe("ChatService", () => {
  describe("listMessages", () => {
    it("lanza NotFoundException si el usuario no es participante del plan", async () => {
      const { service } = buildService({});
      await expect(service.listMessages("stranger", "plan-1")).rejects.toThrow(NotFoundException);
    });

    it("permite leer a un participante no confirmado (pending)", async () => {
      const messageFindMany = jest.fn().mockResolvedValue([sampleMessage()]);
      const { service } = buildService({ messageFindMany });
      const result = await service.listMessages("user-2", "plan-1");
      expect(result).toHaveLength(1);
      expect(result[0].senderName).toBe("Ana");
    });
  });

  describe("sendMessage", () => {
    it("lanza ForbiddenException si quien envía no está confirmado", async () => {
      const { service } = buildService({});
      await expect(service.sendMessage("user-2", "plan-1", { content: "Hola" })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("lanza BadRequestException si el mensaje está vacío tras recortar espacios", async () => {
      const { service } = buildService({});
      await expect(service.sendMessage("owner", "plan-1", { content: "   " })).rejects.toThrow(
        BadRequestException,
      );
    });

    it("crea el mensaje con el contenido recortado", async () => {
      const messageCreate = jest.fn().mockResolvedValue(sampleMessage({ content: "Hola a todos" }));
      const { service, prisma } = buildService({ messageCreate });
      const result = await service.sendMessage("owner", "plan-1", { content: "  Hola a todos  " });
      expect(result.content).toBe("Hola a todos");
      expect(prisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { planId: "plan-1", senderId: "owner", content: "Hola a todos" } }),
      );
    });
  });
});
