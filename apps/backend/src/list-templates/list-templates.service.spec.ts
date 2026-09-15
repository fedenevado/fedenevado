import { NotFoundException } from "@nestjs/common";
import { ListTemplatesService } from "./list-templates.service";

function sampleTemplate(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "tpl-1",
    userId: "owner",
    title: "Qué llevar",
    items: [{ text: "Toalla", order: 0 }],
    ...overrides,
  };
}

function buildService(overrides: {
  listTemplateFindUnique?: jest.Mock;
  listTemplateFindMany?: jest.Mock;
  listTemplateCreate?: jest.Mock;
  listTemplateUpdate?: jest.Mock;
  listTemplateDelete?: jest.Mock;
  listTemplateItemDeleteMany?: jest.Mock;
  listUpdateMany?: jest.Mock;
}) {
  const prisma: any = {
    listTemplate: {
      findUnique: overrides.listTemplateFindUnique ?? jest.fn().mockResolvedValue(sampleTemplate()),
      findMany: overrides.listTemplateFindMany ?? jest.fn().mockResolvedValue([]),
      create: overrides.listTemplateCreate ?? jest.fn().mockResolvedValue(sampleTemplate()),
      update: overrides.listTemplateUpdate ?? jest.fn().mockResolvedValue(sampleTemplate()),
      delete: overrides.listTemplateDelete ?? jest.fn(),
    },
    listTemplateItem: {
      deleteMany: overrides.listTemplateItemDeleteMany ?? jest.fn(),
    },
    list: {
      updateMany: overrides.listUpdateMany ?? jest.fn(),
    },
    $transaction: jest.fn(async (arg: unknown) => {
      if (typeof arg === "function") {
        return (arg as (tx: unknown) => unknown)(prisma);
      }
      return Promise.all(arg as Promise<unknown>[]);
    }),
  };
  return { service: new ListTemplatesService(prisma), prisma };
}

describe("ListTemplatesService", () => {
  describe("updateTemplate / deleteTemplate", () => {
    it("lanza NotFoundException si la plantilla no es del usuario", async () => {
      const listTemplateFindUnique = jest.fn().mockResolvedValue(sampleTemplate({ userId: "other-user" }));
      const { service } = buildService({ listTemplateFindUnique });
      await expect(service.updateTemplate("owner", "tpl-1", { title: "Nuevo" })).rejects.toThrow(
        NotFoundException,
      );
    });

    it("reemplaza los elementos cuando se pasan items nuevos", async () => {
      const { service, prisma } = buildService({});
      await service.updateTemplate("owner", "tpl-1", { items: ["Gafas de sol"] });
      expect(prisma.listTemplateItem.deleteMany).toHaveBeenCalledWith({ where: { templateId: "tpl-1" } });
      expect(prisma.listTemplate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ items: { create: [{ text: "Gafas de sol", order: 0 }] } }),
        }),
      );
    });

    it("borra la plantilla y desenlaza cualquier lista que la usara, sin borrarlas", async () => {
      const { service, prisma } = buildService({});
      await service.deleteTemplate("owner", "tpl-1");
      expect(prisma.list.updateMany).toHaveBeenCalledWith({
        where: { templateId: "tpl-1" },
        data: { templateId: null },
      });
      expect(prisma.listTemplate.delete).toHaveBeenCalledWith({ where: { id: "tpl-1" } });
    });

    it("lanza NotFoundException al borrar si la plantilla no es del usuario", async () => {
      const listTemplateFindUnique = jest.fn().mockResolvedValue(sampleTemplate({ userId: "other-user" }));
      const { service } = buildService({ listTemplateFindUnique });
      await expect(service.deleteTemplate("owner", "tpl-1")).rejects.toThrow(NotFoundException);
    });
  });
});
