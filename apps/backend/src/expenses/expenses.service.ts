import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { UpdateExpenseDto } from "./dto/update-expense.dto";

export interface ExpenseSplitSummary {
  userId: string;
  name: string;
  amountOwed: number;
}

export interface ExpenseSummary {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  paidByName: string;
  createdAt: string;
  splits: ExpenseSplitSummary[];
}

export interface BalanceEntry {
  userId: string;
  name: string;
  net: number;
}

export interface SettlementTransfer {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
  paid: boolean;
}

export interface BalancesResult {
  expensesClosed: boolean;
  myNet: number;
  balances: BalanceEntry[];
  settlement: SettlementTransfer[];
}

const PLAN_INCLUDE = {
  participants: { include: { user: true } },
  config: true,
} satisfies Prisma.PlanInclude;

type PlanWithParticipants = Prisma.PlanGetPayload<{ include: typeof PLAN_INCLUDE }>;

const EXPENSE_INCLUDE = {
  payer: true,
  splits: { include: { user: true } },
} satisfies Prisma.ExpenseInclude;

type ExpenseWithSplits = Prisma.ExpenseGetPayload<{ include: typeof EXPENSE_INCLUDE }>;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toExpenseSummary(expense: ExpenseWithSplits): ExpenseSummary {
  return {
    id: expense.id,
    description: expense.description,
    amount: Number(expense.amount),
    paidBy: expense.paidBy,
    paidByName: expense.payer.name,
    createdAt: expense.createdAt.toISOString(),
    splits: expense.splits.map((s) => ({
      userId: s.userId,
      name: s.user.name,
      amountOwed: Number(s.amountOwed),
    })),
  };
}

@Injectable()
export class ExpensesService {
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

  private confirmedParticipants(plan: PlanWithParticipants) {
    return plan.participants.filter((p) => p.rsvpStatus === "yes" && p.userId);
  }

  private assertConfirmed(plan: PlanWithParticipants, userId: string): void {
    const isConfirmed = this.confirmedParticipants(plan).some((p) => p.userId === userId);
    if (!isConfirmed) {
      throw new ForbiddenException("Solo los participantes confirmados pueden gestionar los gastos.");
    }
  }

  private assertExpensesOpen(plan: PlanWithParticipants): void {
    if (plan.config?.expensesClosed) {
      throw new ForbiddenException("Las cuentas están cerradas. Reábrelas para editar gastos.");
    }
  }

  private assertValidPayerAndSplit(plan: PlanWithParticipants, paidBy: string, splitWith: string[]): void {
    const confirmedIds = new Set(this.confirmedParticipants(plan).map((p) => p.userId as string));
    if (!confirmedIds.has(paidBy)) {
      throw new BadRequestException("Quien paga debe ser un participante confirmado del plan.");
    }
    const invalid = splitWith.filter((id) => !confirmedIds.has(id));
    if (invalid.length > 0) {
      throw new BadRequestException("Solo puedes repartir el gasto entre participantes confirmados.");
    }
  }

  private planParticipantId(plan: PlanWithParticipants, userId: string): string | undefined {
    return plan.participants.find((p) => p.userId === userId)?.id;
  }

  private computeSettlement(plan: PlanWithParticipants, expenses: ExpenseWithSplits[]): {
    balances: BalanceEntry[];
    settlement: Omit<SettlementTransfer, "paid">[];
  } {
    const confirmed = this.confirmedParticipants(plan);
    const net = new Map<string, number>();
    confirmed.forEach((p) => net.set(p.userId as string, 0));

    for (const expense of expenses) {
      const amount = Number(expense.amount);
      net.set(expense.paidBy, (net.get(expense.paidBy) ?? 0) + amount);
      for (const split of expense.splits) {
        const owed = Number(split.amountOwed);
        net.set(split.userId, (net.get(split.userId) ?? 0) - owed);
      }
    }

    const nameOf = (userId: string) => plan.participants.find((p) => p.userId === userId)?.user?.name ?? "";

    const balances: BalanceEntry[] = confirmed.map((p) => ({
      userId: p.userId as string,
      name: p.user?.name ?? "",
      net: round2(net.get(p.userId as string) ?? 0),
    }));

    const debtors = balances
      .filter((b) => b.net < -0.01)
      .map((b) => ({ ...b }))
      .sort((a, b) => a.net - b.net);
    const creditors = balances
      .filter((b) => b.net > 0.01)
      .map((b) => ({ ...b }))
      .sort((a, b) => b.net - a.net);

    const settlement: Omit<SettlementTransfer, "paid">[] = [];
    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const amount = Math.min(-debtors[i].net, creditors[j].net);
      if (amount > 0.01) {
        settlement.push({
          fromId: debtors[i].userId,
          fromName: nameOf(debtors[i].userId),
          toId: creditors[j].userId,
          toName: nameOf(creditors[j].userId),
          amount: round2(amount),
        });
      }
      debtors[i].net += amount;
      creditors[j].net -= amount;
      if (Math.abs(debtors[i].net) < 0.01) i++;
      if (Math.abs(creditors[j].net) < 0.01) j++;
    }

    return { balances, settlement };
  }

  async listExpenses(userId: string, planId: string): Promise<ExpenseSummary[]> {
    await this.loadPlan(planId, userId);
    const expenses = await this.prisma.expense.findMany({
      where: { planId },
      include: EXPENSE_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return expenses.map(toExpenseSummary);
  }

  async createExpense(userId: string, planId: string, dto: CreateExpenseDto): Promise<ExpenseSummary> {
    const plan = await this.loadPlan(planId, userId);
    this.assertConfirmed(plan, userId);
    this.assertExpensesOpen(plan);
    this.assertValidPayerAndSplit(plan, dto.paidBy, dto.splitWith);

    const perShare = round2(dto.amount / dto.splitWith.length);

    const expense = await this.prisma.expense.create({
      data: {
        planId,
        paidBy: dto.paidBy,
        description: dto.description,
        amount: dto.amount,
        splitType: "equal",
        splits: {
          create: dto.splitWith.map((uid) => ({
            userId: uid,
            amountOwed: perShare,
            planParticipantId: this.planParticipantId(plan, uid),
          })),
        },
      },
      include: EXPENSE_INCLUDE,
    });

    return toExpenseSummary(expense);
  }

  async updateExpense(
    userId: string,
    planId: string,
    expenseId: string,
    dto: UpdateExpenseDto,
  ): Promise<ExpenseSummary> {
    const plan = await this.loadPlan(planId, userId);
    this.assertConfirmed(plan, userId);
    this.assertExpensesOpen(plan);

    const existing = await this.prisma.expense.findUnique({
      where: { id: expenseId },
      include: EXPENSE_INCLUDE,
    });
    if (!existing || existing.planId !== planId) {
      throw new NotFoundException("Gasto no encontrado.");
    }

    const paidBy = dto.paidBy ?? existing.paidBy;
    const splitWith = dto.splitWith ?? existing.splits.map((s) => s.userId);
    const amount = dto.amount ?? Number(existing.amount);
    this.assertValidPayerAndSplit(plan, paidBy, splitWith);

    const perShare = round2(amount / splitWith.length);

    await this.prisma.expenseSplit.deleteMany({ where: { expenseId } });
    const expense = await this.prisma.expense.update({
      where: { id: expenseId },
      data: {
        description: dto.description ?? existing.description,
        amount,
        paidBy,
        splits: {
          create: splitWith.map((uid) => ({
            userId: uid,
            amountOwed: perShare,
            planParticipantId: this.planParticipantId(plan, uid),
          })),
        },
      },
      include: EXPENSE_INCLUDE,
    });

    return toExpenseSummary(expense);
  }

  async deleteExpense(userId: string, planId: string, expenseId: string): Promise<void> {
    const plan = await this.loadPlan(planId, userId);
    this.assertConfirmed(plan, userId);
    this.assertExpensesOpen(plan);

    const existing = await this.prisma.expense.findUnique({ where: { id: expenseId } });
    if (!existing || existing.planId !== planId) {
      throw new NotFoundException("Gasto no encontrado.");
    }
    await this.prisma.expense.delete({ where: { id: expenseId } });
  }

  async getBalances(userId: string, planId: string): Promise<BalancesResult> {
    const plan = await this.loadPlan(planId, userId);
    this.assertConfirmed(plan, userId);

    const expenses = await this.prisma.expense.findMany({
      where: { planId },
      include: EXPENSE_INCLUDE,
    });
    const { balances, settlement } = this.computeSettlement(plan, expenses);

    const payments = await this.prisma.payment.findMany({ where: { planId } });
    const settlementWithPaid: SettlementTransfer[] = settlement.map((t) => {
      const paid = payments.some(
        (p) => p.fromId === t.fromId && p.toId === t.toId && Math.abs(Number(p.amount) - t.amount) < 0.01,
      );
      return { ...t, paid };
    });

    const myNet = balances.find((b) => b.userId === userId)?.net ?? 0;

    return {
      expensesClosed: plan.config?.expensesClosed ?? false,
      myNet,
      balances,
      settlement: settlementWithPaid,
    };
  }

  async closeAccounts(userId: string, planId: string): Promise<{ expensesClosed: boolean }> {
    const plan = await this.loadPlan(planId, userId);
    this.assertConfirmed(plan, userId);
    await this.prisma.planFieldConfig.upsert({
      where: { planId },
      create: { planId, expensesClosed: true },
      update: { expensesClosed: true },
    });
    return { expensesClosed: true };
  }

  async reopenAccounts(userId: string, planId: string): Promise<{ expensesClosed: boolean }> {
    const plan = await this.loadPlan(planId, userId);
    this.assertConfirmed(plan, userId);
    await this.prisma.planFieldConfig.upsert({
      where: { planId },
      create: { planId, expensesClosed: false },
      update: { expensesClosed: false },
    });
    return { expensesClosed: false };
  }

  async markTransferPaid(userId: string, planId: string, fromId: string, toId: string): Promise<BalancesResult> {
    const plan = await this.loadPlan(planId, userId);
    if (userId !== fromId && userId !== toId) {
      throw new ForbiddenException("Solo las personas implicadas en la transferencia pueden marcarla como pagada.");
    }
    if (!plan.config?.expensesClosed) {
      throw new ForbiddenException("Cierra las cuentas antes de marcar transferencias como pagadas.");
    }

    const expenses = await this.prisma.expense.findMany({ where: { planId }, include: EXPENSE_INCLUDE });
    const { settlement } = this.computeSettlement(plan, expenses);
    const transfer = settlement.find((t) => t.fromId === fromId && t.toId === toId);
    if (!transfer) {
      throw new BadRequestException("Esa transferencia ya no existe en el reparto actual.");
    }

    await this.prisma.payment.upsert({
      where: { planId_fromId_toId: { planId, fromId, toId } },
      create: { planId, fromId, toId, amount: transfer.amount },
      update: { amount: transfer.amount, paidAt: new Date() },
    });

    const otherPartyId = userId === fromId ? toId : fromId;
    await this.prisma.notification.create({
      data: {
        userId: otherPartyId,
        type: "expense_settled",
        planId,
        actorId: userId,
      },
    });

    return this.getBalances(userId, planId);
  }

  async unmarkTransferPaid(userId: string, planId: string, fromId: string, toId: string): Promise<BalancesResult> {
    await this.loadPlan(planId, userId);
    if (userId !== fromId && userId !== toId) {
      throw new ForbiddenException("Solo las personas implicadas en la transferencia pueden desmarcarla.");
    }
    await this.prisma.payment.deleteMany({ where: { planId, fromId, toId } });
    return this.getBalances(userId, planId);
  }
}
