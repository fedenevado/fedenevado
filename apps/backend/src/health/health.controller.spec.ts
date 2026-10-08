import { ServiceUnavailableException } from "@nestjs/common";
import { HealthController } from "./health.controller";
import type { PrismaService } from "../prisma/prisma.service";

function buildController(queryRaw: jest.Mock) {
  return new HealthController({ $queryRaw: queryRaw } as unknown as PrismaService);
}

describe("HealthController", () => {
  it("devuelve ok si la base de datos responde", async () => {
    const controller = buildController(jest.fn().mockResolvedValue([{ "?column?": 1 }]));
    await expect(controller.check()).resolves.toEqual({ status: "ok", database: "up" });
  });

  it("devuelve 503 si la base de datos no responde", async () => {
    const controller = buildController(jest.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    await expect(controller.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
