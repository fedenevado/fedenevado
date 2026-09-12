import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { FriendshipsService } from "./friendships.service";

function buildService(overrides: {
  userFindUnique?: jest.Mock;
  userFindMany?: jest.Mock;
  friendshipFindFirst?: jest.Mock;
  friendshipFindMany?: jest.Mock;
  friendshipFindUnique?: jest.Mock;
  friendshipCreate?: jest.Mock;
  friendshipUpdate?: jest.Mock;
  friendshipDelete?: jest.Mock;
}) {
  const prisma: any = {
    user: {
      findUnique: overrides.userFindUnique ?? jest.fn(),
      findMany: overrides.userFindMany ?? jest.fn(),
    },
    friendship: {
      findFirst: overrides.friendshipFindFirst ?? jest.fn(),
      findMany: overrides.friendshipFindMany ?? jest.fn(),
      findUnique: overrides.friendshipFindUnique ?? jest.fn(),
      create: overrides.friendshipCreate ?? jest.fn(),
      update: overrides.friendshipUpdate ?? jest.fn(),
      delete: overrides.friendshipDelete ?? jest.fn(),
    },
  };
  return new FriendshipsService(prisma);
}

describe("FriendshipsService", () => {
  describe("sendRequest", () => {
    it("lanza BadRequestException si se intenta enviar una solicitud a uno mismo", async () => {
      const service = buildService({});
      await expect(service.sendRequest("user-1", "user-1")).rejects.toThrow(BadRequestException);
    });

    it("lanza NotFoundException si el destinatario no existe", async () => {
      const userFindUnique = jest.fn().mockResolvedValue(null);
      const service = buildService({ userFindUnique });
      await expect(service.sendRequest("user-1", "user-2")).rejects.toThrow(NotFoundException);
    });

    it("lanza ConflictException si ya existe una relación en cualquier dirección", async () => {
      const userFindUnique = jest.fn().mockResolvedValue({ id: "user-2" });
      const friendshipFindFirst = jest.fn().mockResolvedValue({ id: "f1" });
      const service = buildService({ userFindUnique, friendshipFindFirst });
      await expect(service.sendRequest("user-1", "user-2")).rejects.toThrow(ConflictException);
    });

    it("crea la solicitud pendiente cuando no hay relación previa", async () => {
      const userFindUnique = jest.fn().mockResolvedValue({ id: "user-2" });
      const friendshipFindFirst = jest.fn().mockResolvedValue(null);
      const friendshipCreate = jest.fn().mockResolvedValue({ id: "f1" });
      const service = buildService({ userFindUnique, friendshipFindFirst, friendshipCreate });

      const result = await service.sendRequest("user-1", "user-2");

      expect(friendshipCreate).toHaveBeenCalledWith({
        data: { requesterId: "user-1", addresseeId: "user-2", status: "pending" },
      });
      expect(result).toEqual({ id: "f1" });
    });
  });

  describe("acceptRequest", () => {
    it("lanza NotFoundException si la solicitud no existe", async () => {
      const friendshipFindUnique = jest.fn().mockResolvedValue(null);
      const service = buildService({ friendshipFindUnique });
      await expect(service.acceptRequest("user-1", "f1")).rejects.toThrow(NotFoundException);
    });

    it("lanza ForbiddenException si quien acepta no es el destinatario", async () => {
      const friendshipFindUnique = jest.fn().mockResolvedValue({ id: "f1", addresseeId: "user-2", status: "pending" });
      const service = buildService({ friendshipFindUnique });
      await expect(service.acceptRequest("user-1", "f1")).rejects.toThrow(ForbiddenException);
    });

    it("lanza BadRequestException si la solicitud ya no está pendiente", async () => {
      const friendshipFindUnique = jest.fn().mockResolvedValue({ id: "f1", addresseeId: "user-1", status: "accepted" });
      const service = buildService({ friendshipFindUnique });
      await expect(service.acceptRequest("user-1", "f1")).rejects.toThrow(BadRequestException);
    });

    it("acepta la solicitud pendiente del destinatario correcto", async () => {
      const friendshipFindUnique = jest.fn().mockResolvedValue({ id: "f1", addresseeId: "user-1", status: "pending" });
      const friendshipUpdate = jest.fn().mockResolvedValue({});
      const service = buildService({ friendshipFindUnique, friendshipUpdate });

      await service.acceptRequest("user-1", "f1");

      expect(friendshipUpdate).toHaveBeenCalledWith({ where: { id: "f1" }, data: { status: "accepted" } });
    });
  });

  describe("removeRequest", () => {
    it("lanza ForbiddenException si el usuario no pertenece a la solicitud", async () => {
      const friendshipFindUnique = jest
        .fn()
        .mockResolvedValue({ id: "f1", requesterId: "user-2", addresseeId: "user-3", status: "pending" });
      const service = buildService({ friendshipFindUnique });
      await expect(service.removeRequest("user-1", "f1")).rejects.toThrow(ForbiddenException);
    });

    it("borra la solicitud pendiente cuando el usuario es el emisor o el destinatario", async () => {
      const friendshipFindUnique = jest
        .fn()
        .mockResolvedValue({ id: "f1", requesterId: "user-1", addresseeId: "user-2", status: "pending" });
      const friendshipDelete = jest.fn().mockResolvedValue({});
      const service = buildService({ friendshipFindUnique, friendshipDelete });

      await service.removeRequest("user-1", "f1");

      expect(friendshipDelete).toHaveBeenCalledWith({ where: { id: "f1" } });
    });
  });

  describe("searchUsers", () => {
    it("devuelve la relación correcta para cada usuario encontrado", async () => {
      const userFindMany = jest.fn().mockResolvedValue([
        { id: "u2", name: "Marta", avatarUrl: null },
        { id: "u3", name: "Julián", avatarUrl: null },
        { id: "u4", name: "Laura", avatarUrl: null },
      ]);
      const friendshipFindMany = jest.fn().mockResolvedValue([
        { id: "f1", requesterId: "user-1", addresseeId: "u2", status: "accepted" },
        { id: "f2", requesterId: "user-1", addresseeId: "u3", status: "pending" },
        { id: "f3", requesterId: "u4", addresseeId: "user-1", status: "pending" },
      ]);
      const service = buildService({ userFindMany, friendshipFindMany });

      const results = await service.searchUsers("user-1", "a");

      expect(results).toEqual([
        { id: "u2", name: "Marta", avatarUrl: null, relation: "friends", friendshipId: "f1" },
        { id: "u3", name: "Julián", avatarUrl: null, relation: "pending_sent", friendshipId: "f2" },
        { id: "u4", name: "Laura", avatarUrl: null, relation: "pending_received", friendshipId: "f3" },
      ]);
    });
  });
});
