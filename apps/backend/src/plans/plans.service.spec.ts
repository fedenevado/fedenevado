import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { PlansService } from "./plans.service";

function buildService(overrides: {
  planFindMany?: jest.Mock;
  planFindUnique?: jest.Mock;
  planCreate?: jest.Mock;
  planUpdate?: jest.Mock;
  planDelete?: jest.Mock;
  friendshipFindMany?: jest.Mock;
  participantFindFirst?: jest.Mock;
  participantUpdate?: jest.Mock;
  participantDeleteMany?: jest.Mock;
  participantCreateMany?: jest.Mock;
  notificationCreateMany?: jest.Mock;
}) {
  const prisma: any = {
    plan: {
      findMany: overrides.planFindMany ?? jest.fn(),
      findUnique: overrides.planFindUnique ?? jest.fn(),
      create: overrides.planCreate ?? jest.fn(),
      update: overrides.planUpdate ?? jest.fn(),
      delete: overrides.planDelete ?? jest.fn(),
    },
    friendship: {
      findMany: overrides.friendshipFindMany ?? jest.fn().mockResolvedValue([]),
    },
    planParticipant: {
      findFirst: overrides.participantFindFirst ?? jest.fn(),
      update: overrides.participantUpdate ?? jest.fn(),
      deleteMany: overrides.participantDeleteMany ?? jest.fn(),
      createMany: overrides.participantCreateMany ?? jest.fn(),
    },
    notification: {
      createMany: overrides.notificationCreateMany ?? jest.fn(),
    },
  };
  return { service: new PlansService(prisma), prisma };
}

const owner = { id: "p1", userId: "user-1", guestName: null, role: "owner", rsvpStatus: "yes", user: { id: "user-1", name: "Ana", avatarUrl: null } };

function samplePlan(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "plan-1",
    ownerId: "user-1",
    title: "Finde en Sintra",
    type: "viaje",
    startDate: new Date("2026-10-03T00:00:00.000Z"),
    endDate: new Date("2026-10-05T00:00:00.000Z"),
    time: null,
    location: "Sintra",
    participants: [owner],
    ...overrides,
  };
}

describe("PlansService", () => {
  describe("getPlan", () => {
    it("lanza NotFoundException si el plan no existe", async () => {
      const { service } = buildService({ planFindUnique: jest.fn().mockResolvedValue(null) });
      await expect(service.getPlan("user-1", "plan-1")).rejects.toThrow(NotFoundException);
    });

    it("lanza NotFoundException si el usuario no es participante", async () => {
      const { service } = buildService({ planFindUnique: jest.fn().mockResolvedValue(samplePlan()) });
      await expect(service.getPlan("user-2", "plan-1")).rejects.toThrow(NotFoundException);
    });

    it("devuelve el plan con fechas en formato YYYY-MM-DD", async () => {
      const { service } = buildService({ planFindUnique: jest.fn().mockResolvedValue(samplePlan()) });
      const result = await service.getPlan("user-1", "plan-1");
      expect(result.startDate).toBe("2026-10-03");
      expect(result.endDate).toBe("2026-10-05");
      expect(result.participants).toEqual([
        { id: "p1", userId: "user-1", name: "Ana", avatarUrl: null, role: "owner", rsvpStatus: "yes" },
      ]);
    });
  });

  describe("createPlan", () => {
    it("lanza ForbiddenException si algún invitado no es amigo aceptado", async () => {
      const { service } = buildService({ friendshipFindMany: jest.fn().mockResolvedValue([]) });
      await expect(
        service.createPlan("user-1", {
          title: "Cena",
          type: "comida",
          startDate: "2026-10-03",
          invitedFriendIds: ["user-2"],
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it("descarta endDate/time que no correspondan al tipo del plan", async () => {
      const planCreate = jest.fn().mockResolvedValue(samplePlan({ type: "plan_casual", endDate: null }));
      const { service, prisma } = buildService({ planCreate });

      await service.createPlan("user-1", {
        title: "Peli en casa",
        type: "plan_casual",
        startDate: "2026-10-03",
        endDate: "2026-10-05",
        time: "20:00",
      } as any);

      expect(prisma.plan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ endDate: null, time: null }),
        }),
      );
    });

    it("crea al owner con rsvp 'yes' y a los invitados con rsvp 'pending'", async () => {
      const friendshipFindMany = jest.fn().mockResolvedValue([
        { requesterId: "user-1", addresseeId: "user-2", status: "accepted" },
      ]);
      const planCreate = jest.fn().mockResolvedValue(samplePlan());
      const { service, prisma } = buildService({ friendshipFindMany, planCreate });

      await service.createPlan("user-1", {
        title: "Finde en Sintra",
        type: "viaje",
        startDate: "2026-10-03",
        endDate: "2026-10-05",
        invitedFriendIds: ["user-2"],
      } as any);

      expect(prisma.plan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            participants: {
              create: [
                { userId: "user-1", role: "owner", rsvpStatus: "yes" },
                { userId: "user-2", role: "guest", rsvpStatus: "pending" },
              ],
            },
          }),
        }),
      );
    });

    it("notifica (plan_invite) a los amigos invitados, no a quien crea el plan", async () => {
      const friendshipFindMany = jest.fn().mockResolvedValue([
        { requesterId: "user-1", addresseeId: "user-2", status: "accepted" },
      ]);
      const planCreate = jest.fn().mockResolvedValue(samplePlan());
      const { service, prisma } = buildService({ friendshipFindMany, planCreate });

      await service.createPlan("user-1", {
        title: "Finde en Sintra",
        type: "viaje",
        startDate: "2026-10-03",
        invitedFriendIds: ["user-2"],
      } as any);

      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: [{ userId: "user-2", type: "plan_invite", planId: "plan-1", actorId: "user-1" }],
      });
    });
  });

  describe("updatePlan", () => {
    it("lanza ForbiddenException si quien edita no es el owner", async () => {
      const { service } = buildService({ planFindUnique: jest.fn().mockResolvedValue(samplePlan()) });
      await expect(service.updatePlan("user-2", "plan-1", { title: "Nuevo" } as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("lanza NotFoundException si el plan no existe", async () => {
      const { service } = buildService({ planFindUnique: jest.fn().mockResolvedValue(null) });
      await expect(service.updatePlan("user-1", "plan-1", { title: "Nuevo" } as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("notifica (plan_invite) solo a quien se invita de nuevo, no a quien ya estaba", async () => {
      const existingGuest = { id: "p2", userId: "user-2", guestName: null, role: "guest", rsvpStatus: "pending", user: { id: "user-2", name: "Bob", avatarUrl: null } };
      const friendshipFindMany = jest.fn().mockResolvedValue([
        { requesterId: "user-1", addresseeId: "user-2", status: "accepted" },
        { requesterId: "user-1", addresseeId: "user-3", status: "accepted" },
      ]);
      const planFindUnique = jest.fn().mockResolvedValue(samplePlan({ participants: [owner, existingGuest] }));
      const { service, prisma } = buildService({ planFindUnique, friendshipFindMany });

      await service.updatePlan("user-1", "plan-1", { invitedFriendIds: ["user-2", "user-3"] } as any);

      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: [{ userId: "user-3", type: "plan_invite", planId: "plan-1", actorId: "user-1" }],
      });
    });
  });

  describe("deletePlan", () => {
    it("lanza ForbiddenException si quien borra no es el owner", async () => {
      const { service } = buildService({ planFindUnique: jest.fn().mockResolvedValue(samplePlan()) });
      await expect(service.deletePlan("user-2", "plan-1")).rejects.toThrow(ForbiddenException);
    });

    it("borra el plan cuando quien lo pide es el owner", async () => {
      const planDelete = jest.fn().mockResolvedValue({});
      const { service, prisma } = buildService({
        planFindUnique: jest.fn().mockResolvedValue(samplePlan()),
        planDelete,
      });
      await service.deletePlan("user-1", "plan-1");
      expect(prisma.plan.delete).toHaveBeenCalledWith({ where: { id: "plan-1" } });
    });
  });

  describe("setRsvp", () => {
    it("lanza ForbiddenException si el usuario no es participante del plan", async () => {
      const { service } = buildService({ participantFindFirst: jest.fn().mockResolvedValue(null) });
      await expect(service.setRsvp("user-1", "plan-1", "no")).rejects.toThrow(ForbiddenException);
    });

    it("actualiza el rsvp del participante correcto", async () => {
      const participantFindFirst = jest.fn().mockResolvedValue({ id: "p1" });
      const participantUpdate = jest.fn().mockResolvedValue({});
      const planFindUnique = jest.fn().mockResolvedValue(samplePlan({ participants: [owner] }));
      const { service, prisma } = buildService({ participantFindFirst, participantUpdate, planFindUnique });

      await service.setRsvp("user-1", "plan-1", "no");

      expect(prisma.planParticipant.update).toHaveBeenCalledWith({
        where: { id: "p1" },
        data: { rsvpStatus: "no" },
      });
    });
  });
});
