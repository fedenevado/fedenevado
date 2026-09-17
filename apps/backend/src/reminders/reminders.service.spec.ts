import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { RemindersService } from "./reminders.service";

function sampleReminder(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "rem-1",
    ownerId: "owner",
    date: new Date("2026-09-20T00:00:00.000Z"),
    title: "Comprar billetes",
    time: null,
    done: false,
    owner: { name: "Owner Name" },
    sharedWith: [
      { id: "share-1", reminderId: "rem-1", userId: "friend-1", user: { name: "Friend One", avatarUrl: null } },
    ],
    items: [{ id: "item-1", text: "Pasaporte", done: false, order: 0 }],
    ...overrides,
  };
}

function buildService(overrides: {
  reminderFindUnique?: jest.Mock;
  reminderFindMany?: jest.Mock;
  reminderCreate?: jest.Mock;
  reminderUpdate?: jest.Mock;
  reminderDelete?: jest.Mock;
  reminderShareDeleteMany?: jest.Mock;
  reminderShareCreateMany?: jest.Mock;
  reminderItemFindUnique?: jest.Mock;
  reminderItemCreate?: jest.Mock;
  reminderItemUpdate?: jest.Mock;
  reminderItemDelete?: jest.Mock;
  friendshipFindMany?: jest.Mock;
}) {
  const prisma: any = {
    reminder: {
      findUnique: overrides.reminderFindUnique ?? jest.fn().mockResolvedValue(sampleReminder()),
      findMany: overrides.reminderFindMany ?? jest.fn().mockResolvedValue([]),
      create: overrides.reminderCreate ?? jest.fn().mockResolvedValue(sampleReminder()),
      update: overrides.reminderUpdate ?? jest.fn().mockResolvedValue(sampleReminder()),
      delete: overrides.reminderDelete ?? jest.fn(),
    },
    reminderShare: {
      deleteMany: overrides.reminderShareDeleteMany ?? jest.fn(),
      createMany: overrides.reminderShareCreateMany ?? jest.fn(),
    },
    reminderItem: {
      findUnique: overrides.reminderItemFindUnique ?? jest.fn(),
      create: overrides.reminderItemCreate ?? jest.fn(),
      update: overrides.reminderItemUpdate ?? jest.fn(),
      delete: overrides.reminderItemDelete ?? jest.fn(),
    },
    friendship: {
      findMany:
        overrides.friendshipFindMany ??
        jest.fn().mockResolvedValue([{ requesterId: "owner", addresseeId: "friend-1", status: "accepted" }]),
    },
  };
  return { service: new RemindersService(prisma), prisma };
}

describe("RemindersService", () => {
  describe("acceso (loadReminder)", () => {
    it("lanza NotFoundException si quien pide no es owner ni está en sharedWith", async () => {
      const { service } = buildService({});
      await expect(service.setDone("stranger", "rem-1", { done: true })).rejects.toThrow(NotFoundException);
    });

    it("permite a quien está en sharedWith marcar como hecha", async () => {
      const { service } = buildService({});
      await expect(service.setDone("friend-1", "rem-1", { done: true })).resolves.toBeDefined();
    });

    it("permite al propietario marcar como hecha", async () => {
      const { service } = buildService({});
      await expect(service.setDone("owner", "rem-1", { done: true })).resolves.toBeDefined();
    });
  });

  describe("createReminder", () => {
    it("lanza ForbiddenException si se comparte con alguien que no es amigo aceptado", async () => {
      const friendshipFindMany = jest.fn().mockResolvedValue([]);
      const { service } = buildService({ friendshipFindMany });
      await expect(
        service.createReminder("owner", { title: "Tarea", date: "2026-09-20", sharedWith: ["not-friend"] }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("crea la tarea con el owner correcto y los elementos iniciales", async () => {
      const reminderCreate = jest.fn().mockResolvedValue(sampleReminder());
      const { service } = buildService({ reminderCreate });
      const result = await service.createReminder("owner", {
        title: "Comprar billetes",
        date: "2026-09-20",
        items: ["Pasaporte"],
      });
      expect(result.title).toBe("Comprar billetes");
      expect(reminderCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: "owner",
            title: "Comprar billetes",
            items: { create: [{ text: "Pasaporte", order: 0 }] },
          }),
        }),
      );
    });
  });

  describe("updateReminder", () => {
    it("lanza ForbiddenException si quien edita no es el propietario", async () => {
      const { service } = buildService({});
      await expect(service.updateReminder("friend-1", "rem-1", { title: "Otro título" })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("añade y quita comparticiones cuando sharedWith cambia", async () => {
      const friendshipFindMany = jest.fn().mockResolvedValue([
        { requesterId: "owner", addresseeId: "friend-2", status: "accepted" },
      ]);
      const { service, prisma } = buildService({ friendshipFindMany });
      await service.updateReminder("owner", "rem-1", { sharedWith: ["friend-2"] });
      expect(prisma.reminderShare.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["share-1"] } } });
      expect(prisma.reminderShare.createMany).toHaveBeenCalledWith({
        data: [{ reminderId: "rem-1", userId: "friend-2" }],
      });
    });
  });

  describe("deleteReminder", () => {
    it("lanza ForbiddenException si quien borra no es el propietario", async () => {
      const { service } = buildService({});
      await expect(service.deleteReminder("friend-1", "rem-1")).rejects.toThrow(ForbiddenException);
    });

    it("borra la tarea cuando la pide el propietario", async () => {
      const reminderDelete = jest.fn();
      const { service, prisma } = buildService({ reminderDelete });
      await service.deleteReminder("owner", "rem-1");
      expect(prisma.reminder.delete).toHaveBeenCalledWith({ where: { id: "rem-1" } });
    });
  });

  describe("items", () => {
    it("lanza NotFoundException si el elemento no pertenece a la tarea", async () => {
      const reminderItemFindUnique = jest.fn().mockResolvedValue({ id: "item-1", reminderId: "otra-tarea" });
      const { service } = buildService({ reminderItemFindUnique });
      await expect(service.updateItem("owner", "rem-1", "item-1", { done: true })).rejects.toThrow(
        NotFoundException,
      );
    });

    it("permite a quien está en sharedWith añadir un elemento", async () => {
      const reminderItemCreate = jest.fn();
      const { service, prisma } = buildService({ reminderItemCreate });
      await service.addItem("friend-1", "rem-1", { text: "Billete de tren" });
      expect(prisma.reminderItem.create).toHaveBeenCalledWith({
        data: { reminderId: "rem-1", text: "Billete de tren", order: 1 },
      });
    });
  });
});
