import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
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
  participantCreate?: jest.Mock;
  notificationCreateMany?: jest.Mock;
  notificationCreate?: jest.Mock;
  invitationFindFirst?: jest.Mock;
  invitationFindUnique?: jest.Mock;
  invitationCreate?: jest.Mock;
  invitationUpdate?: jest.Mock;
  joinRequestFindFirst?: jest.Mock;
  joinRequestFindMany?: jest.Mock;
  joinRequestFindUnique?: jest.Mock;
  joinRequestCreate?: jest.Mock;
  joinRequestUpdate?: jest.Mock;
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
      create: overrides.participantCreate ?? jest.fn().mockResolvedValue({}),
    },
    notification: {
      createMany: overrides.notificationCreateMany ?? jest.fn(),
      create: overrides.notificationCreate ?? jest.fn().mockResolvedValue({}),
    },
    invitation: {
      findFirst: overrides.invitationFindFirst ?? jest.fn(),
      findUnique: overrides.invitationFindUnique ?? jest.fn(),
      create: overrides.invitationCreate ?? jest.fn(),
      update: overrides.invitationUpdate ?? jest.fn().mockResolvedValue({}),
    },
    joinRequest: {
      findFirst: overrides.joinRequestFindFirst ?? jest.fn(),
      findMany: overrides.joinRequestFindMany ?? jest.fn(),
      findUnique: overrides.joinRequestFindUnique ?? jest.fn(),
      create: overrides.joinRequestCreate ?? jest.fn().mockResolvedValue({}),
      update: overrides.joinRequestUpdate ?? jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
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

  describe("getOrCreateInvitation", () => {
    it("lanza ForbiddenException si quien pide el enlace no es el owner", async () => {
      const { service } = buildService({ planFindUnique: jest.fn().mockResolvedValue(samplePlan()) });
      await expect(service.getOrCreateInvitation("user-2", "plan-1")).rejects.toThrow(ForbiddenException);
    });

    it("devuelve el token existente en vez de crear uno nuevo (idempotente)", async () => {
      const invitationFindFirst = jest.fn().mockResolvedValue({ token: "existing-token" });
      const invitationCreate = jest.fn();
      const { service, prisma } = buildService({
        planFindUnique: jest.fn().mockResolvedValue(samplePlan()),
        invitationFindFirst,
        invitationCreate,
      });

      const result = await service.getOrCreateInvitation("user-1", "plan-1");

      expect(result).toEqual({ token: "existing-token" });
      expect(prisma.invitation.create).not.toHaveBeenCalled();
    });

    it("crea una invitación nueva si no hay ninguna activa", async () => {
      const invitationFindFirst = jest.fn().mockResolvedValue(null);
      const invitationCreate = jest.fn().mockResolvedValue({ token: "new-token" });
      const { service, prisma } = buildService({
        planFindUnique: jest.fn().mockResolvedValue(samplePlan()),
        invitationFindFirst,
        invitationCreate,
      });

      const result = await service.getOrCreateInvitation("user-1", "plan-1");

      expect(result).toEqual({ token: "new-token" });
      expect(prisma.invitation.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ planId: "plan-1", createdBy: "user-1" }) }),
      );
    });
  });

  describe("joinViaInvitationToken", () => {
    it("lanza NotFoundException si el token no existe, está revocado o caducado", async () => {
      const { service } = buildService({ invitationFindUnique: jest.fn().mockResolvedValue(null) });
      await expect(service.joinViaInvitationToken("user-2", "bad-token")).rejects.toThrow(NotFoundException);
    });

    it("devuelve already_participant sin crear nada si ya es participante", async () => {
      const invitation = { id: "inv-1", planId: "plan-1", revoked: false, expiresAt: null, plan: samplePlan() };
      const { service, prisma } = buildService({
        invitationFindUnique: jest.fn().mockResolvedValue(invitation),
        participantFindFirst: jest.fn().mockResolvedValue({ id: "p2" }),
      });

      const result = await service.joinViaInvitationToken("user-2", "token-1");

      expect(result).toEqual({ status: "already_participant", planId: "plan-1" });
      expect(prisma.planParticipant.create).not.toHaveBeenCalled();
    });

    it("une directo a un plan público e incrementa usesCount", async () => {
      const invitation = {
        id: "inv-1",
        planId: "plan-1",
        revoked: false,
        expiresAt: null,
        plan: samplePlan({ visibility: "publica" }),
      };
      const { service, prisma } = buildService({
        invitationFindUnique: jest.fn().mockResolvedValue(invitation),
        participantFindFirst: jest.fn().mockResolvedValue(null),
      });

      const result = await service.joinViaInvitationToken("user-2", "token-1");

      expect(result).toEqual({ status: "joined", planId: "plan-1" });
      expect(prisma.planParticipant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ planId: "plan-1", userId: "user-2", role: "guest", rsvpStatus: "pending" }),
        }),
      );
      expect(prisma.invitation.update).toHaveBeenCalledWith({
        where: { id: "inv-1" },
        data: { usesCount: { increment: 1 } },
      });
    });

    it("crea una JoinRequest pendiente y notifica al owner si el plan es privado", async () => {
      const invitation = {
        id: "inv-1",
        planId: "plan-1",
        revoked: false,
        expiresAt: null,
        plan: samplePlan({ visibility: "privada" }),
      };
      const joinRequestCreate = jest.fn().mockResolvedValue({});
      const notificationCreate = jest.fn().mockResolvedValue({});
      const { service, prisma } = buildService({
        invitationFindUnique: jest.fn().mockResolvedValue(invitation),
        participantFindFirst: jest.fn().mockResolvedValue(null),
        joinRequestFindFirst: jest.fn().mockResolvedValue(null),
        joinRequestCreate,
        notificationCreate,
      });

      const result = await service.joinViaInvitationToken("user-2", "token-1");

      expect(result).toEqual({ status: "pending", planId: "plan-1" });
      expect(prisma.joinRequest.create).toHaveBeenCalledWith({
        data: { planId: "plan-1", userId: "user-2", status: "pending" },
      });
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: { userId: "user-1", type: "join_request_received", planId: "plan-1", actorId: "user-2" },
      });
      expect(prisma.planParticipant.create).not.toHaveBeenCalled();
    });

    it("no duplica la JoinRequest si ya hay una pendiente del mismo usuario", async () => {
      const invitation = {
        id: "inv-1",
        planId: "plan-1",
        revoked: false,
        expiresAt: null,
        plan: samplePlan({ visibility: "privada" }),
      };
      const { service, prisma } = buildService({
        invitationFindUnique: jest.fn().mockResolvedValue(invitation),
        participantFindFirst: jest.fn().mockResolvedValue(null),
        joinRequestFindFirst: jest.fn().mockResolvedValue({ id: "req-1" }),
      });

      const result = await service.joinViaInvitationToken("user-2", "token-1");

      expect(result).toEqual({ status: "pending", planId: "plan-1" });
      expect(prisma.joinRequest.create).not.toHaveBeenCalled();
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });
  });

  describe("previewInvitation", () => {
    function invitationWithConfig(overrides: Partial<Record<string, unknown>> = {}) {
      return {
        id: "inv-1",
        planId: "plan-1",
        revoked: false,
        expiresAt: null,
        plan: {
          ...samplePlan(),
          owner: { id: "user-1", name: "Ana García" },
          config: null,
          participants: [
            owner,
            { id: "p2", userId: "user-2", guestName: null, rsvpStatus: "yes", user: { id: "user-2", name: "Bea" } },
            { id: "p3", userId: "user-3", guestName: null, rsvpStatus: "pending", user: { id: "user-3", name: "Caro" } },
          ],
        },
        ...overrides,
      };
    }

    it("lanza NotFoundException si el token no existe, está revocado o caducado", async () => {
      const { service } = buildService({ invitationFindUnique: jest.fn().mockResolvedValue(null) });
      await expect(service.previewInvitation("bad-token")).rejects.toThrow(NotFoundException);
    });

    it("sin config, usa public_full por defecto y devuelve hasta 6 confirmados", async () => {
      const { service } = buildService({
        invitationFindUnique: jest.fn().mockResolvedValue(invitationWithConfig()),
      });

      const result = await service.previewInvitation("token-1");

      expect(result.organizerName).toBe("Ana García");
      expect(result.guestListVisibility).toBe("public_full");
      expect(result.confirmedCount).toBe(2);
      expect(result.confirmedPreview).toEqual([{ name: "Ana" }, { name: "Bea" }]);
    });

    it("con guestListVisibility hidden, no devuelve ni conteo ni nombres", async () => {
      const invitation = invitationWithConfig();
      invitation.plan.config = { guestListVisibility: "hidden" } as never;
      const { service } = buildService({ invitationFindUnique: jest.fn().mockResolvedValue(invitation) });

      const result = await service.previewInvitation("token-1");

      expect(result.confirmedCount).toBeNull();
      expect(result.confirmedPreview).toBeNull();
    });

    it("con guestListVisibility public_count, devuelve el conteo pero no los nombres", async () => {
      const invitation = invitationWithConfig();
      invitation.plan.config = { guestListVisibility: "public_count" } as never;
      const { service } = buildService({ invitationFindUnique: jest.fn().mockResolvedValue(invitation) });

      const result = await service.previewInvitation("token-1");

      expect(result.confirmedCount).toBe(2);
      expect(result.confirmedPreview).toBeNull();
    });
  });

  describe("joinAsGuest", () => {
    it("lanza NotFoundException si el token no existe, está revocado o caducado", async () => {
      const { service } = buildService({ invitationFindUnique: jest.fn().mockResolvedValue(null) });
      await expect(service.joinAsGuest("bad-token", "Nuria")).rejects.toThrow(NotFoundException);
    });

    it("lanza BadRequestException si el nombre está vacío tras recortar espacios", async () => {
      const invitation = {
        id: "inv-1",
        planId: "plan-1",
        revoked: false,
        expiresAt: null,
        plan: { ...samplePlan({ visibility: "publica" }), owner: { id: "user-1", name: "Ana" }, config: null },
      };
      const { service } = buildService({ invitationFindUnique: jest.fn().mockResolvedValue(invitation) });
      await expect(service.joinAsGuest("token-1", "   ")).rejects.toThrow(BadRequestException);
    });

    it("une directo como invitado confirmado (yes) a un plan público e incrementa usesCount", async () => {
      const invitation = {
        id: "inv-1",
        planId: "plan-1",
        revoked: false,
        expiresAt: null,
        plan: { ...samplePlan({ visibility: "publica" }), owner: { id: "user-1", name: "Ana" }, config: null },
      };
      const { service, prisma } = buildService({
        invitationFindUnique: jest.fn().mockResolvedValue(invitation),
      });

      const result = await service.joinAsGuest("token-1", "  Nuria  ");

      expect(result).toEqual({ status: "joined", planId: "plan-1" });
      expect(prisma.planParticipant.create).toHaveBeenCalledWith({
        data: {
          planId: "plan-1",
          guestName: "Nuria",
          role: "guest",
          rsvpStatus: "yes",
          invitationId: "inv-1",
        },
      });
      expect(prisma.invitation.update).toHaveBeenCalledWith({
        where: { id: "inv-1" },
        data: { usesCount: { increment: 1 } },
      });
    });

    it("crea una JoinRequest pendiente sin actor y notifica al owner si el plan es privado", async () => {
      const invitation = {
        id: "inv-1",
        planId: "plan-1",
        revoked: false,
        expiresAt: null,
        plan: { ...samplePlan({ visibility: "privada" }), owner: { id: "user-1", name: "Ana" }, config: null },
      };
      const { service, prisma } = buildService({
        invitationFindUnique: jest.fn().mockResolvedValue(invitation),
      });

      const result = await service.joinAsGuest("token-1", "Nuria");

      expect(result).toEqual({ status: "pending", planId: "plan-1" });
      expect(prisma.joinRequest.create).toHaveBeenCalledWith({
        data: { planId: "plan-1", guestName: "Nuria", status: "pending" },
      });
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: { userId: "user-1", type: "join_request_received", planId: "plan-1", actorId: null },
      });
      expect(prisma.planParticipant.create).not.toHaveBeenCalled();
    });
  });

  describe("listJoinRequests", () => {
    it("lanza ForbiddenException si quien pregunta no es el owner", async () => {
      const { service } = buildService({ planFindUnique: jest.fn().mockResolvedValue(samplePlan()) });
      await expect(service.listJoinRequests("user-2", "plan-1")).rejects.toThrow(ForbiddenException);
    });

    it("devuelve solo las solicitudes pendientes con el nombre del solicitante", async () => {
      const joinRequestFindMany = jest.fn().mockResolvedValue([
        {
          id: "req-1",
          userId: "user-2",
          guestName: null,
          requestedAt: new Date("2026-09-16T10:00:00.000Z"),
          user: { name: "Bob" },
        },
      ]);
      const { service } = buildService({
        planFindUnique: jest.fn().mockResolvedValue(samplePlan()),
        joinRequestFindMany,
      });

      const result = await service.listJoinRequests("user-1", "plan-1");

      expect(result).toEqual([
        { id: "req-1", userId: "user-2", name: "Bob", requestedAt: "2026-09-16T10:00:00.000Z" },
      ]);
    });
  });

  describe("approveJoinRequest", () => {
    it("lanza NotFoundException si la solicitud no existe, no es de este plan o ya se resolvió", async () => {
      const { service } = buildService({
        planFindUnique: jest.fn().mockResolvedValue(samplePlan()),
        joinRequestFindUnique: jest.fn().mockResolvedValue(null),
      });
      await expect(service.approveJoinRequest("user-1", "plan-1", "req-1")).rejects.toThrow(NotFoundException);
    });

    it("crea el participante, marca la solicitud aprobada y notifica al solicitante", async () => {
      const joinRequest = { id: "req-1", planId: "plan-1", userId: "user-2", guestName: null, status: "pending" };
      const { service, prisma } = buildService({
        planFindUnique: jest.fn().mockResolvedValue(samplePlan()),
        joinRequestFindUnique: jest.fn().mockResolvedValue(joinRequest),
      });

      await service.approveJoinRequest("user-1", "plan-1", "req-1");

      expect(prisma.planParticipant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ planId: "plan-1", userId: "user-2", role: "guest", rsvpStatus: "pending" }),
        }),
      );
      expect(prisma.joinRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "req-1" }, data: expect.objectContaining({ status: "approved" }) }),
      );
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: "user-2", type: "join_request_approved", planId: "plan-1", actorId: "user-1" }),
        }),
      );
    });
  });

  describe("rejectJoinRequest", () => {
    it("marca la solicitud como rechazada sin crear participante ni notificar", async () => {
      const joinRequest = { id: "req-1", planId: "plan-1", userId: "user-2", guestName: null, status: "pending" };
      const { service, prisma } = buildService({
        planFindUnique: jest.fn().mockResolvedValue(samplePlan()),
        joinRequestFindUnique: jest.fn().mockResolvedValue(joinRequest),
      });

      await service.rejectJoinRequest("user-1", "plan-1", "req-1");

      expect(prisma.joinRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "req-1" }, data: expect.objectContaining({ status: "rejected" }) }),
      );
      expect(prisma.planParticipant.create).not.toHaveBeenCalled();
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });
  });
});
