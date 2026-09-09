import { ConfigService } from "@nestjs/config";
import { UnauthorizedException, ExecutionContext } from "@nestjs/common";
import * as jwt from "jsonwebtoken";
import { SupabaseAuthGuard } from "./supabase-auth.guard";

function contextWithAuthHeader(authHeader?: string): ExecutionContext {
  const request: any = { headers: { authorization: authHeader } };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe("SupabaseAuthGuard", () => {
  const secret = "test-secret";
  const config = { getOrThrow: () => secret } as unknown as ConfigService;
  const guard = new SupabaseAuthGuard(config);

  it("rechaza si no hay header Authorization", () => {
    expect(() => guard.canActivate(contextWithAuthHeader(undefined))).toThrow(UnauthorizedException);
  });

  it("rechaza un token con firma inválida", () => {
    const badToken = jwt.sign({ sub: "user-1" }, "otro-secreto");
    expect(() => guard.canActivate(contextWithAuthHeader(`Bearer ${badToken}`))).toThrow(UnauthorizedException);
  });

  it("acepta un token válido y adjunta el usuario a la request", () => {
    const token = jwt.sign({ sub: "user-1", email: "ana@example.com" }, secret, { algorithm: "HS256" });
    const context = contextWithAuthHeader(`Bearer ${token}`);
    const result = guard.canActivate(context);

    expect(result).toBe(true);
    const request = context.switchToHttp().getRequest<any>();
    expect(request.user).toEqual({ id: "user-1", email: "ana@example.com" });
  });
});
