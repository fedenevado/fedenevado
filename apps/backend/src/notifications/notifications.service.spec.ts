import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";

function sampleNotification(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "notif-1",
    userId: "user-1",
    type: "new_expense",
    planId: "plan-1",
    actorId: "user-2",
    read: false,
    createdAt: new Date("2026-10-01T10:00:00.000Z"),
    ...overrides,
  };
}

function buildService(overrides: {
  notificationFindMany?: jest.Mock;
  notificationFindUnique?: jest.Mock;
  notificationUpdate?: jest.Mock;
  notificationUpdateMany?: jest.Mock;
  userFindMany?: jest.Mock;
  planFindMany?: jest.Mock;
}) {
  const prisma: any = {
    notification: {
      findMany: overrides.notificationFindMany ?? jest.fn().mockResolvedValue([]),
      findUnique: overrides.notificationFindUnique ?? jest.fn(),
      update: overrides.notificationUpdate ?? jest.fn(),
      updateMany: overrides.notificationUpdateMany ?? jest.fn(),
    },
    user: {
      findMany: overrides.userFindMany ?? jest.fn().mockResolvedValue([{ id: "user-2", name: "Bob" }]),
    },
    plan: {
      findMany: overrides.planFindMany ?? jest.fn().mockResolvedValue([{ id: "plan-1", title: "Finde en Sintra" }]),
    },
  };
  return { service: new NotificationsService(prisma), prisma };
}

describe("NotificationsService", () => {
  describe("listNotifications", () => {
    it("devuelve el mensaje y la pestaña de destino calculados a partir del tipo", async () => {
      const notificationFindMany = jest.fn().mockResolvedValue([sampleNotification()]);
      const { service } = buildService({ notificationFindMany });

      const result = await service.listNotifications("user-1");

      expect(result).toEqual([
        {
          id: "notif-1",
          read: false,
          createdAt: "2026-10-01T10:00:00.000Z",
          message: "Bob añadió un gasto en Finde en Sintra",
          planId: "plan-1",
          targetTab: "gastos",
          type: "new_expense",
        },
      ]);
    });

    it("descarta notificaciones cuyo plan ya no existe (sin dónde llevar al tocarlas)", async () => {
      const notificationFindMany = jest.fn().mockResolvedValue([sampleNotification({ planId: "plan-borrado" })]);
      const planFindMany = jest.fn().mockResolvedValue([]);
      const { service } = buildService({ notificationFindMany, planFindMany });

      const result = await service.listNotifications("user-1");

      expect(result).toEqual([]);
    });

    it("usa 'Alguien' si el actor ya no existe", async () => {
      const notificationFindMany = jest.fn().mockResolvedValue([sampleNotification()]);
      const userFindMany = jest.fn().mockResolvedValue([]);
      const { service } = buildService({ notificationFindMany, userFindMany });

      const result = await service.listNotifications("user-1");

      expect(result[0].message).toBe("Alguien añadió un gasto en Finde en Sintra");
    });
  });

  describe("markRead", () => {
    it("lanza NotFoundException si la notificación no existe", async () => {
      const { service } = buildService({ notificationFindUnique: jest.fn().mockResolvedValue(null) });
      await expect(service.markRead("user-1", "notif-1")).rejects.toThrow(NotFoundException);
    });

    it("lanza ForbiddenException si la notificación no es de quien la marca", async () => {
      const notificationFindUnique = jest.fn().mockResolvedValue(sampleNotification({ userId: "other-user" }));
      const { service } = buildService({ notificationFindUnique });
      await expect(service.markRead("user-1", "notif-1")).rejects.toThrow(ForbiddenException);
    });

    it("marca como leída la notificación propia", async () => {
      const notificationFindUnique = jest.fn().mockResolvedValue(sampleNotification());
      const { service, prisma } = buildService({ notificationFindUnique });
      await service.markRead("user-1", "notif-1");
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: "notif-1" },
        data: { read: true },
      });
    });
  });

  describe("markAllRead", () => {
    it("marca como leídas solo las notificaciones no leídas del usuario", async () => {
      const { service, prisma } = buildService({});
      await service.markAllRead("user-1");
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-1", read: false },
        data: { read: true },
      });
    });
  });
});
