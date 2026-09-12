import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { SupabaseAuthGuard, type AuthenticatedUser } from "../auth/supabase-auth.guard";
import { ExpensesService } from "./expenses.service";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { UpdateExpenseDto } from "./dto/update-expense.dto";
import { MarkPaidDto } from "./dto/mark-paid.dto";

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller("plans/:planId/expenses")
@UseGuards(SupabaseAuthGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  listExpenses(@Param("planId") planId: string, @Req() request: AuthenticatedRequest) {
    return this.expensesService.listExpenses(request.user.id, planId);
  }

  @Post()
  createExpense(
    @Param("planId") planId: string,
    @Body() dto: CreateExpenseDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.expensesService.createExpense(request.user.id, planId, dto);
  }

  @Patch(":expenseId")
  updateExpense(
    @Param("planId") planId: string,
    @Param("expenseId") expenseId: string,
    @Body() dto: UpdateExpenseDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.expensesService.updateExpense(request.user.id, planId, expenseId, dto);
  }

  @Delete(":expenseId")
  async deleteExpense(
    @Param("planId") planId: string,
    @Param("expenseId") expenseId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.expensesService.deleteExpense(request.user.id, planId, expenseId);
    return { success: true };
  }

  @Get("balances")
  getBalances(@Param("planId") planId: string, @Req() request: AuthenticatedRequest) {
    return this.expensesService.getBalances(request.user.id, planId);
  }

  @Post("close-accounts")
  closeAccounts(@Param("planId") planId: string, @Req() request: AuthenticatedRequest) {
    return this.expensesService.closeAccounts(request.user.id, planId);
  }

  @Post("reopen-accounts")
  reopenAccounts(@Param("planId") planId: string, @Req() request: AuthenticatedRequest) {
    return this.expensesService.reopenAccounts(request.user.id, planId);
  }

  @Patch("settlements/pay")
  markPaid(@Param("planId") planId: string, @Body() dto: MarkPaidDto, @Req() request: AuthenticatedRequest) {
    return this.expensesService.markTransferPaid(request.user.id, planId, dto.fromId, dto.toId);
  }

  @Delete("settlements/pay")
  unmarkPaid(@Param("planId") planId: string, @Body() dto: MarkPaidDto, @Req() request: AuthenticatedRequest) {
    return this.expensesService.unmarkTransferPaid(request.user.id, planId, dto.fromId, dto.toId);
  }
}
