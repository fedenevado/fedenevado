import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";

function buildService(overrides: {
  createUser?: jest.Mock;
  signInWithPassword?: jest.Mock;
  userUpsert?: jest.Mock;
  userCreate?: jest.Mock;
}) {
  const supabaseAdmin: any = {
    auth: { admin: { createUser: overrides.createUser ?? jest.fn() } },
  };
  const supabaseAuth: any = {
    auth: { signInWithPassword: overrides.signInWithPassword ?? jest.fn() },
  };
  const prisma: any = {
    user: {
      create: overrides.userCreate ?? jest.fn(),
      upsert: overrides.userUpsert ?? jest.fn(),
    },
  };

  return new AuthService(supabaseAdmin, supabaseAuth, prisma);
}

describe("AuthService", () => {
  it("register: crea el usuario en Supabase, lo sincroniza en la BD y devuelve un access token", async () => {
    const createUser = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const userCreate = jest.fn().mockResolvedValue({});
    const signInWithPassword = jest.fn().mockResolvedValue({
      data: { session: { access_token: "token-123" }, user: { id: "user-1", user_metadata: { name: "Ana" } } },
      error: null,
    });
    const userUpsert = jest.fn().mockResolvedValue({ id: "user-1", name: "Ana", email: "ana@example.com" });

    const service = buildService({ createUser, userCreate, signInWithPassword, userUpsert });

    const result = await service.register({ name: "Ana", email: "ana@example.com", password: "password123" });

    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: "ana@example.com", email_confirm: true }),
    );
    expect(userCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ id: "user-1", email: "ana@example.com" }) }),
    );
    expect(result).toEqual({ accessToken: "token-123", user: { id: "user-1", name: "Ana", email: "ana@example.com" } });
  });

  it("register: lanza ConflictException si el email ya existe en Supabase", async () => {
    const createUser = jest.fn().mockResolvedValue({
      data: { user: null },
      error: { message: "User already registered", status: 422 },
    });
    const service = buildService({ createUser });

    await expect(
      service.register({ name: "Ana", email: "ana@example.com", password: "password123" }),
    ).rejects.toThrow(ConflictException);
  });

  it("login: lanza UnauthorizedException con credenciales inválidas", async () => {
    const signInWithPassword = jest.fn().mockResolvedValue({ data: { session: null, user: null }, error: { message: "Invalid" } });
    const service = buildService({ signInWithPassword });

    await expect(service.login({ email: "ana@example.com", password: "bad" })).rejects.toThrow(UnauthorizedException);
  });
});
