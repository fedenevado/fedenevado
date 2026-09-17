import { BadRequestException, ConflictException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";

function buildService(overrides: {
  createUser?: jest.Mock;
  signInWithPassword?: jest.Mock;
  getUser?: jest.Mock;
  resetPasswordForEmail?: jest.Mock;
  refreshSession?: jest.Mock;
  updateUserById?: jest.Mock;
  userUpsert?: jest.Mock;
  userCreate?: jest.Mock;
  configGet?: jest.Mock;
}) {
  const supabaseAdmin: any = {
    auth: {
      admin: {
        createUser: overrides.createUser ?? jest.fn(),
        updateUserById: overrides.updateUserById ?? jest.fn(),
      },
    },
  };
  const supabaseAuth: any = {
    auth: {
      signInWithPassword: overrides.signInWithPassword ?? jest.fn(),
      getUser: overrides.getUser ?? jest.fn(),
      resetPasswordForEmail: overrides.resetPasswordForEmail ?? jest.fn(),
      refreshSession: overrides.refreshSession ?? jest.fn(),
    },
  };
  const prisma: any = {
    user: {
      create: overrides.userCreate ?? jest.fn(),
      upsert: overrides.userUpsert ?? jest.fn(),
    },
  };
  const config: any = { get: overrides.configGet ?? jest.fn().mockReturnValue(undefined) };

  return new AuthService(supabaseAdmin, supabaseAuth, prisma, config);
}

describe("AuthService", () => {
  it("register: crea el usuario en Supabase, lo sincroniza en la BD y devuelve un access token", async () => {
    const createUser = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const userCreate = jest.fn().mockResolvedValue({});
    const signInWithPassword = jest.fn().mockResolvedValue({
      data: {
        session: { access_token: "token-123", refresh_token: "refresh-123" },
        user: { id: "user-1", user_metadata: { name: "Ana" } },
      },
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
    expect(result).toEqual({
      accessToken: "token-123",
      refreshToken: "refresh-123",
      user: { id: "user-1", name: "Ana", email: "ana@example.com" },
    });
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

  it("forgotPassword: siempre responde success, exista o no el email", async () => {
    const resetPasswordForEmail = jest.fn().mockResolvedValue({ data: {}, error: { message: "User not found" } });
    const service = buildService({ resetPasswordForEmail });

    const result = await service.forgotPassword({ email: "nadie@example.com" });

    expect(result).toEqual({ success: true });
    expect(resetPasswordForEmail).toHaveBeenCalledWith(
      "nadie@example.com",
      expect.objectContaining({ redirectTo: expect.any(String) }),
    );
  });

  it("forgotPassword: usa AUTH_RESET_PASSWORD_REDIRECT_URL si está configurada", async () => {
    const resetPasswordForEmail = jest.fn().mockResolvedValue({ data: {}, error: null });
    const configGet = jest.fn().mockReturnValue("mobile://custom-reset");
    const service = buildService({ resetPasswordForEmail, configGet });

    await service.forgotPassword({ email: "ana@example.com" });

    expect(resetPasswordForEmail).toHaveBeenCalledWith("ana@example.com", { redirectTo: "mobile://custom-reset" });
  });

  it("resetPassword: lanza UnauthorizedException si el token de recuperación no es válido", async () => {
    const getUser = jest.fn().mockResolvedValue({ data: { user: null }, error: { message: "invalid" } });
    const service = buildService({ getUser });

    await expect(service.resetPassword({ accessToken: "bad-token", newPassword: "password123" })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("resetPassword: actualiza la contraseña y devuelve una sesión nueva", async () => {
    const getUser = jest.fn().mockResolvedValue({ data: { user: { id: "user-1", email: "ana@example.com" } }, error: null });
    const updateUserById = jest.fn().mockResolvedValue({ error: null });
    const signInWithPassword = jest.fn().mockResolvedValue({
      data: {
        session: { access_token: "token-456", refresh_token: "refresh-456" },
        user: { id: "user-1", user_metadata: { name: "Ana" } },
      },
      error: null,
    });
    const userUpsert = jest.fn().mockResolvedValue({ id: "user-1", name: "Ana", email: "ana@example.com" });
    const service = buildService({ getUser, updateUserById, signInWithPassword, userUpsert });

    const result = await service.resetPassword({ accessToken: "good-token", newPassword: "newpassword123" });

    expect(updateUserById).toHaveBeenCalledWith("user-1", { password: "newpassword123" });
    expect(result).toEqual({
      accessToken: "token-456",
      refreshToken: "refresh-456",
      user: { id: "user-1", name: "Ana", email: "ana@example.com" },
    });
  });

  it("resetPassword: lanza BadRequestException si Supabase rechaza la nueva contraseña", async () => {
    const getUser = jest.fn().mockResolvedValue({ data: { user: { id: "user-1", email: "ana@example.com" } }, error: null });
    const updateUserById = jest.fn().mockResolvedValue({ error: { message: "Password too weak" } });
    const service = buildService({ getUser, updateUserById });

    await expect(service.resetPassword({ accessToken: "good-token", newPassword: "newpassword123" })).rejects.toThrow(
      BadRequestException,
    );
  });

  it("refresh: devuelve tokens nuevos con un refresh token válido", async () => {
    const refreshSession = jest.fn().mockResolvedValue({
      data: { session: { access_token: "token-789", refresh_token: "refresh-789" } },
      error: null,
    });
    const service = buildService({ refreshSession });

    const result = await service.refresh({ refreshToken: "refresh-123" });

    expect(refreshSession).toHaveBeenCalledWith({ refresh_token: "refresh-123" });
    expect(result).toEqual({ accessToken: "token-789", refreshToken: "refresh-789" });
  });

  it("refresh: lanza UnauthorizedException si el refresh token ya no es válido", async () => {
    const refreshSession = jest.fn().mockResolvedValue({ data: { session: null }, error: { message: "invalid_grant" } });
    const service = buildService({ refreshSession });

    await expect(service.refresh({ refreshToken: "expired" })).rejects.toThrow(UnauthorizedException);
  });
});
