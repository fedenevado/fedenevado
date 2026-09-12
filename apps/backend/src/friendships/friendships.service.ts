import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface FriendSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface PendingRequestSummary {
  friendshipId: string;
  from: FriendSummary;
  createdAt: Date;
}

export type FriendRelation = "none" | "pending_sent" | "pending_received" | "friends";

export interface FriendSearchResult extends FriendSummary {
  relation: FriendRelation;
  friendshipId: string | null;
}

@Injectable()
export class FriendshipsService {
  constructor(private readonly prisma: PrismaService) {}

  async listFriends(userId: string): Promise<FriendSummary[]> {
    const friendships = await this.prisma.friendship.findMany({
      where: { status: "accepted", OR: [{ requesterId: userId }, { addresseeId: userId }] },
      include: { requester: true, addressee: true },
    });

    return friendships.map((f) => {
      const other = f.requesterId === userId ? f.addressee : f.requester;
      return { id: other.id, name: other.name, avatarUrl: other.avatarUrl };
    });
  }

  async listPendingRequests(userId: string): Promise<PendingRequestSummary[]> {
    const friendships = await this.prisma.friendship.findMany({
      where: { status: "pending", addresseeId: userId },
      include: { requester: true },
      orderBy: { createdAt: "desc" },
    });

    return friendships.map((f) => ({
      friendshipId: f.id,
      from: { id: f.requester.id, name: f.requester.name, avatarUrl: f.requester.avatarUrl },
      createdAt: f.createdAt,
    }));
  }

  async searchUsers(userId: string, q: string): Promise<FriendSearchResult[]> {
    const query = q.trim();
    if (!query) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: { not: userId },
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 20,
      orderBy: { name: "asc" },
    });

    if (users.length === 0) {
      return [];
    }

    const ids = users.map((u) => u.id);
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: userId, addresseeId: { in: ids } },
          { addresseeId: userId, requesterId: { in: ids } },
        ],
      },
    });

    return users.map((u) => {
      const friendship = friendships.find((f) => f.requesterId === u.id || f.addresseeId === u.id);
      let relation: FriendRelation = "none";
      if (friendship) {
        if (friendship.status === "accepted") {
          relation = "friends";
        } else if (friendship.requesterId === userId) {
          relation = "pending_sent";
        } else {
          relation = "pending_received";
        }
      }
      return {
        id: u.id,
        name: u.name,
        avatarUrl: u.avatarUrl,
        relation,
        friendshipId: friendship?.id ?? null,
      };
    });
  }

  async sendRequest(userId: string, addresseeId: string): Promise<{ id: string }> {
    if (addresseeId === userId) {
      throw new BadRequestException("No puedes enviarte una solicitud de amistad a ti mismo.");
    }

    const addressee = await this.prisma.user.findUnique({ where: { id: addresseeId } });
    if (!addressee) {
      throw new NotFoundException("Usuario no encontrado.");
    }

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId },
          { requesterId: addresseeId, addresseeId: userId },
        ],
      },
    });
    if (existing) {
      throw new ConflictException("Ya existe una relación de amistad con este usuario.");
    }

    const friendship = await this.prisma.friendship.create({
      data: { requesterId: userId, addresseeId, status: "pending" },
    });

    return { id: friendship.id };
  }

  async acceptRequest(userId: string, friendshipId: string): Promise<void> {
    const friendship = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!friendship) {
      throw new NotFoundException("Solicitud no encontrada.");
    }
    if (friendship.addresseeId !== userId) {
      throw new ForbiddenException("No puedes aceptar una solicitud que no te pertenece.");
    }
    if (friendship.status !== "pending") {
      throw new BadRequestException("Esta solicitud ya no está pendiente.");
    }

    await this.prisma.friendship.update({ where: { id: friendshipId }, data: { status: "accepted" } });
  }

  async removeRequest(userId: string, friendshipId: string): Promise<void> {
    const friendship = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!friendship) {
      throw new NotFoundException("Solicitud no encontrada.");
    }
    if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
      throw new ForbiddenException("No puedes modificar una solicitud que no te pertenece.");
    }
    if (friendship.status !== "pending") {
      throw new BadRequestException("Esta solicitud ya no está pendiente.");
    }

    await this.prisma.friendship.delete({ where: { id: friendshipId } });
  }
}
