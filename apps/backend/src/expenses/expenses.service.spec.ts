import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { ExpensesService } from "./expenses.service";

function participant(userId: string, name: string, rsvpStatus = "yes") {
  return {
    id: `pp-${userId}`,
    userId,
    guestName: null,
    role: userId === "owner" ? "owner" : "guest",
    rsvpStatus,
    user: { id: userId, name, avatarUrl: null },
  };
}

function samplePlan(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "plan-1",
    ownerId: "owner",
    title: "Finde en Sintra",
    config: null,
    participants: [participant("owner", "Ana"), participant("user-2", "Bob"), participant("user-3", "Cata")],
    ...overrides,
  };
}

function buildService(overrides: {
  planFindUnique?: jest.Mock;
  expenseFindMany?: jest.Mock;
  expenseFindUnique?: jest.Mock;
  expenseCreate?: jest.Mock;
  expenseUpdate?: jest.Mock;
  expenseDelete?: jest.Mock;
  expenseSplitDeleteMany?: jest.Mock;
  paymentFindMany?: jest.Mock;
  paymentUpsert?: jest.Mock;
  paymentDeleteMany?: jest.Mock;
  planFieldConfigUpsert?: jest.Mock;
  notificationCreate?: jest.Mock;
  notificationCreateMany?: jest.Mock;
}) {
  const prisma: any = {
    plan: { findUnique: overrides.planFindUnique ?? jest.fn().mockResolvedValue(samplePlan()) },
    expense: {
      findMany: overrides.expenseFindMany ?? jest.fn().mockResolvedValue([]),
      findUnique: overrides.expenseFindUnique ?? jest.fn(),
      create: overrides.expenseCreate ?? jest.fn(),
      update: overrides.expenseUpdate ?? jest.fn(),
      delete: overrides.expenseDelete ?? jest.fn(),
    },
    expenseSplit: { deleteMany: overrides.expenseSplitDeleteMany ?? jest.fn() },
    payment: {
      findMany: overrides.paymentFindMany ?? jest.fn().mockResolvedValue([]),
      upsert: overrides.paymentUpsert ?? jest.fn(),
      deleteMany: overrides.paymentDeleteMany ?? jest.fn(),
    },
    planFieldConfig: { upsert: overrides.planFieldConfigUpsert ?? jest.fn() },
    notification: {
      create: overrides.notificationCreate ?? jest.fn(),
      createMany: overrides.notificationCreateMany ?? jest.fn(),
    },
  };
  return { service: new ExpensesService(prisma), prisma };
}

describe("ExpensesService", () => {
  describe("createExpense", () => {
    it("lanza NotFoundException si el usuario no es participante del plan", async () => {
      const { service } = buildService({});
      await expect(
        service.createExpense("stranger", "plan-1", {
          description: "Cena",
          amount: 30,
          paidBy: "owner",
          splitWith: ["owner", "user-2"],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("lanza ForbiddenException si quien crea no es un participante confirmado", async () => {
      const planFindUnique = jest.fn().mockResolvedValue(
        samplePlan({ participants: [participant("owner", "Ana"), participant("user-2", "Bob", "pending")] }),
      );
      const { service } = buildService({ planFindUnique });
      await expect(
        service.createExpense("user-2", "plan-1", {
          description: "Cena",
          amount: 30,
          paidBy: "owner",
          splitWith: ["owner"],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("lanza ForbiddenException si las cuentas están cerradas", async () => {
      const planFindUnique = jest.fn().mockResolvedValue(samplePlan({ config: { expensesClosed: true } }));
      const { service } = buildService({ planFindUnique });
      await expect(
        service.createExpense("owner", "plan-1", {
          description: "Cena",
          amount: 30,
          paidBy: "owner",
          splitWith: ["owner"],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("lanza BadRequestException si se reparte con alguien no confirmado", async () => {
      const { service } = buildService({});
      await expect(
        service.createExpense("owner", "plan-1", {
          description: "Cena",
          amount: 30,
          paidBy: "owner",
          splitWith: ["owner", "no-existe"],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("crea el gasto con el reparto igualitario entre los seleccionados", async () => {
      const expenseCreate = jest.fn().mockResolvedValue({
        id: "e1",
        description: "Cena",
        amount: "30",
        paidBy: "owner",
        payer: { name: "Ana" },
        createdAt: new Date("2026-10-01T00:00:00.000Z"),
        splits: [
          { userId: "owner", amountOwed: "15", user: { name: "Ana" } },
          { userId: "user-2", amountOwed: "15", user: { name: "Bob" } },
        ],
      });
      const { service, prisma } = buildService({ expenseCreate });

      const result = await service.createExpense("owner", "plan-1", {
        description: "Cena",
        amount: 30,
        paidBy: "owner",
        splitWith: ["owner", "user-2"],
      });

      expect(prisma.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            splits: { create: [{ userId: "owner", amountOwed: 15, planParticipantId: "pp-owner" }, { userId: "user-2", amountOwed: 15, planParticipantId: "pp-user-2" }] },
          }),
        }),
      );
      expect(result.amount).toBe(30);
      expect(result.splits).toHaveLength(2);
    });

    it("notifica a los demás participantes del plan, pero no a quien creó el gasto", async () => {
      const expenseCreate = jest.fn().mockResolvedValue({
        id: "e1",
        description: "Cena",
        amount: "30",
        paidBy: "owner",
        payer: { name: "Ana" },
        createdAt: new Date("2026-10-01T00:00:00.000Z"),
        splits: [{ userId: "owner", amountOwed: "30", user: { name: "Ana" } }],
      });
      const { service, prisma } = buildService({ expenseCreate });

      await service.createExpense("owner", "plan-1", {
        description: "Cena",
        amount: 30,
        paidBy: "owner",
        splitWith: ["owner"],
      });

      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: [
          { userId: "user-2", type: "new_expense", planId: "plan-1", actorId: "owner" },
          { userId: "user-3", type: "new_expense", planId: "plan-1", actorId: "owner" },
        ],
      });
    });
  });

  describe("getBalances", () => {
    it("calcula balances y el reparto simplificado entre 3 personas", async () => {
      const expenseFindMany = jest.fn().mockResolvedValue([
        {
          id: "e1",
          amount: "30",
          paidBy: "owner",
          splits: [
            { userId: "owner", amountOwed: "10" },
            { userId: "user-2", amountOwed: "10" },
            { userId: "user-3", amountOwed: "10" },
          ],
        },
      ]);
      const { service } = buildService({ expenseFindMany });

      const result = await service.getBalances("owner", "plan-1");

      expect(result.balances).toEqual(
        expect.arrayContaining([
          { userId: "owner", name: "Ana", net: 20 },
          { userId: "user-2", name: "Bob", net: -10 },
          { userId: "user-3", name: "Cata", net: -10 },
        ]),
      );
      expect(result.settlement).toHaveLength(2);
      expect(result.settlement.every((t) => t.toId === "owner")).toBe(true);
      expect(result.myNet).toBe(20);
    });
  });

  describe("markTransferPaid", () => {
    it("lanza ForbiddenException si las cuentas no están cerradas", async () => {
      const { service } = buildService({});
      await expect(service.markTransferPaid("user-2", "plan-1", "user-2", "owner")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("lanza ForbiddenException si quien marca no es parte de la transferencia", async () => {
      const planFindUnique = jest.fn().mockResolvedValue(samplePlan({ config: { expensesClosed: true } }));
      const { service } = buildService({ planFindUnique });
      await expect(service.markTransferPaid("user-3", "plan-1", "user-2", "owner")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("crea el pago y notifica a la otra parte cuando la transferencia es válida", async () => {
      const planFindUnique = jest.fn().mockResolvedValue(samplePlan({ config: { expensesClosed: true } }));
      const expenseFindMany = jest.fn().mockResolvedValue([
        {
          id: "e1",
          amount: "20",
          paidBy: "owner",
          splits: [
            { userId: "owner", amountOwed: "0" },
            { userId: "user-2", amountOwed: "20" },
          ],
        },
      ]);
      const paymentUpsert = jest.fn().mockResolvedValue({});
      const notificationCreate = jest.fn().mockResolvedValue({});
      const { service, prisma } = buildService({
        planFindUnique,
        expenseFindMany,
        paymentUpsert,
        notificationCreate,
      });

      await service.markTransferPaid("user-2", "plan-1", "user-2", "owner");

      expect(prisma.payment.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { planId_fromId_toId: { planId: "plan-1", fromId: "user-2", toId: "owner" } },
          create: { planId: "plan-1", fromId: "user-2", toId: "owner", amount: 20 },
        }),
      );
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: { userId: "owner", type: "expense_settled", planId: "plan-1", actorId: "user-2" },
      });
    });
  });
});
