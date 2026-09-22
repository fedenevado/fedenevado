import { BadRequestException, ConflictException, UnauthorizedException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuthService } from "./auth.service";

function uniqueConstraintError(target: string[]) {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
    meta: { target },
  });
}

function buildService(overrides: {
  createUser?: jest.Mock;
  deleteUser?: jest.Mock;
  signInWithPassword?: jest.Mock;
  getUser?: jest.Mock;
  resetPasswordForEmail?: jest.Mock;
  refreshSession?: jest.Mock;
  updateUserById?: jest.Mock;
  userFindUnique?: jest.Mock;
  userCreate?: jest.Mock;
  configGet?: jest.Mock;
}) {
  const supabaseAdmin: any = {
    auth: {
      admin: {
        createUser: overrides.createUser ?? jest.fn(),
        deleteUser: overrides.deleteUser ?? jest.fn().mockResolvedValue({ error: null }),
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
      findUnique:
        overrides.userFindUnique ??
        jest.fn().mockResolvedValue({ id: "user-1", name: "Ana", username: "ana", email: "ana@example.com" }),
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

    const service = buildService({ createUser, userCreate, signInWithPassword });

    const result = await service.register({
      name: "Ana",
      username: "Ana",
      email: "ana@example.com",
      password: "password123",
    });

    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: "ana@example.com", email_confirm: true }),
    );
    expect(userCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ id: "user-1", email: "ana@example.com", username: "ana" }),
      }),
    );
    expect(result).toEqual({
      accessToken: "token-123",
      refreshToken: "refresh-123",
      user: { id: "user-1", name: "Ana", email: "ana@example.com" },
    });
  });

  it("register: normaliza el username a minúsculas antes de guardarlo", async () => {
    const createUser = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const userCreate = jest.fn().mockResolvedValue({});
    const signInWithPassword = jest.fn().mockResolvedValue({
      data: { session: { access_token: "t", refresh_token: "r" }, user: { id: "user-1", user_metadata: {} } },
      error: null,
    });
    const service = buildService({ createUser, userCreate, signInWithPassword });

    await service.register({ name: "Ana", username: "  AnaG99  ", email: "ana@example.com", password: "password123" });

    expect(userCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ username: "anag99" }) }));
  });

  it("register: lanza ConflictException si el email ya existe en Supabase", async () => {
    const createUser = jest.fn().mockResolvedValue({
      data: { user: null },
      error: { message: "User already registered", status: 422 },
    });
    const service = buildService({ createUser });

    await expect(
      service.register({ name: "Ana", username: "ana", email: "ana@example.com", password: "password123" }),
    ).rejects.toThrow(ConflictException);
  });

  it("register: lanza ConflictException y revierte la cuenta de Supabase si el username ya está en uso", async () => {
    const createUser = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const deleteUser = jest.fn().mockResolvedValue({ error: null });
    const userCreate = jest.fn().mockRejectedValue(uniqueConstraintError(["username"]));
    const service = buildService({ createUser, deleteUser, userCreate });

    await expect(
      service.register({ name: "Ana", username: "ana", email: "ana@example.com", password: "password123" }),
    ).rejects.toThrow(ConflictException);
    expect(deleteUser).toHaveBeenCalledWith("user-1");
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
    const service = buildService({ getUser, updateUserById, signInWithPassword });

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

  describe("suggestUsername", () => {
    it("convierte el nombre a un slug válido (minúsculas, sin acentos)", async () => {
      const userFindUnique = jest.fn().mockResolvedValue(null);
      const service = buildService({ userFindUnique });

      const result = await service.suggestUsername("María José");

      expect(result).toEqual({ username: "maria.jose" });
    });

    it("añade un sufijo numérico si el slug ya está en uso", async () => {
      const userFindUnique = jest
        .fn()
        .mockResolvedValueOnce({ id: "other" }) // "ana" ocupado
        .mockResolvedValueOnce(null); // "ana1" libre
      const service = buildService({ userFindUnique });

      const result = await service.suggestUsername("Ana");

      expect(result).toEqual({ username: "ana1" });
    });
  });

  describe("checkUsernameAvailability", () => {
    it("rechaza formatos inválidos sin consultar la base de datos", async () => {
      const userFindUnique = jest.fn();
      const service = buildService({ userFindUnique });

      const result = await service.checkUsernameAvailability("a");

      expect(result.available).toBe(false);
      expect(userFindUnique).not.toHaveBeenCalled();
    });

    it("rechaza un username ya ocupado", async () => {
      const userFindUnique = jest.fn().mockResolvedValue({ id: "other" });
      const service = buildService({ userFindUnique });

      const result = await service.checkUsernameAvailability("ana");

      expect(result).toEqual({ available: false, reason: "Ese nombre de usuario ya está en uso." });
    });

    it("acepta un username libre y con formato válido", async () => {
      const userFindUnique = jest.fn().mockResolvedValue(null);
      const service = buildService({ userFindUnique });

      const result = await service.checkUsernameAvailability("Ana92");

      expect(result).toEqual({ available: true });
    });
  });
});
