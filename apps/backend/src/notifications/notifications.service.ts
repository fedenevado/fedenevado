import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Notification, NotificationType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type NotificationTargetTab = "detalles" | "gastos" | "chat";

export interface NotificationSummary {
  id: string;
  read: boolean;
  createdAt: string;
  message: string;
  planId: string;
  targetTab: NotificationTargetTab;
  type: NotificationType;
}

const TARGET_TAB: Record<NotificationType, NotificationTargetTab> = {
  plan_invite: "detalles",
  rsvp_reminder: "detalles",
  plan_updated: "detalles",
  join_request_received: "detalles",
  join_request_approved: "detalles",
  new_expense: "gastos",
  expense_settled: "gastos",
  new_message: "chat",
};

function buildMessage(type: NotificationType, actorName: string, planTitle: string): string {
  switch (type) {
    case "plan_invite":
      return `${actorName} te invitó a ${planTitle}`;
    case "new_expense":
      return `${actorName} añadió un gasto en ${planTitle}`;
    case "expense_settled":
      return `${actorName} marcó un pago como hecho en ${planTitle}`;
    case "new_message":
      return `Nuevo mensaje de ${actorName} en ${planTitle}`;
    case "rsvp_reminder":
      return `Recuerda confirmar tu asistencia a ${planTitle}`;
    case "plan_updated":
      return `${actorName} actualizó ${planTitle}`;
    case "join_request_received":
      return `${actorName} quiere unirse a ${planTitle}`;
    case "join_request_approved":
      return `Tu solicitud para unirte a ${planTitle} fue aprobada`;
    default:
      return `Novedad en ${planTitle}`;
  }
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listNotifications(userId: string): Promise<NotificationSummary[]> {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return this.toSummaries(notifications);
  }

  // El schema no tiene relación directa a User (actorId) ni FK con cascade
  // hacia Plan (planId): se resuelven aquí con consultas por lote, y las
  // notificaciones cuyo plan ya no existe se descartan (no tendrían a dónde
  // llevar al tocarlas, y toda notificación debe ser clicable).
  private async toSummaries(notifications: Notification[]): Promise<NotificationSummary[]> {
    if (notifications.length === 0) {
      return [];
    }

    const actorIds = [...new Set(notifications.map((n) => n.actorId).filter((id): id is string => !!id))];
    const planIds = [...new Set(notifications.map((n) => n.planId).filter((id): id is string => !!id))];

    const [actors, plans] = await Promise.all([
      actorIds.length > 0 ? this.prisma.user.findMany({ where: { id: { in: actorIds } } }) : Promise.resolve([]),
      planIds.length > 0 ? this.prisma.plan.findMany({ where: { id: { in: planIds } } }) : Promise.resolve([]),
    ]);
    const actorById = new Map(actors.map((a) => [a.id, a]));
    const planById = new Map(plans.map((p) => [p.id, p]));

    return notifications
      .filter((n) => n.planId && planById.has(n.planId))
      .map((n) => {
        const plan = planById.get(n.planId as string)!;
        const actorName = (n.actorId && actorById.get(n.actorId)?.name) || "Alguien";
        return {
          id: n.id,
          read: n.read,
          createdAt: n.createdAt.toISOString(),
          message: buildMessage(n.type, actorName, plan.title),
          planId: plan.id,
          targetTab: TARGET_TAB[n.type],
          type: n.type,
        };
      });
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    const notification = await this.prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification) {
      throw new NotFoundException("Notificación no encontrada.");
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException("Esta notificación no te pertenece.");
    }
    await this.prisma.notification.update({ where: { id: notificationId }, data: { read: true } });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  }
}
