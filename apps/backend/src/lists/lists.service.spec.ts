import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { ListsService } from "./lists.service";

function participant(userId: string, rsvpStatus = "yes") {
  return { id: `pp-${userId}`, userId, rsvpStatus };
}

function samplePlan(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "plan-1",
    participants: [participant("owner"), participant("user-2"), participant("user-3", "pending")],
    ...overrides,
  };
}

function sampleList(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "list-1",
    planId: "plan-1",
    title: "Compra",
    templateId: null,
    items: [],
    ...overrides,
  };
}

function buildService(overrides: {
  planFindUnique?: jest.Mock;
  listFindUnique?: jest.Mock;
  listFindMany?: jest.Mock;
  listCreate?: jest.Mock;
  listUpdate?: jest.Mock;
  listDelete?: jest.Mock;
  listItemFindUnique?: jest.Mock;
  listItemCreate?: jest.Mock;
  listItemUpdate?: jest.Mock;
  listItemDelete?: jest.Mock;
  listTemplateFindUnique?: jest.Mock;
  listTemplateCreate?: jest.Mock;
  listTemplateDelete?: jest.Mock;
}) {
  const prisma: any = {
    plan: { findUnique: overrides.planFindUnique ?? jest.fn().mockResolvedValue(samplePlan()) },
    list: {
      findUnique: overrides.listFindUnique ?? jest.fn().mockResolvedValue(sampleList()),
      findMany: overrides.listFindMany ?? jest.fn().mockResolvedValue([]),
      create: overrides.listCreate ?? jest.fn().mockResolvedValue(sampleList()),
      update: overrides.listUpdate ?? jest.fn().mockResolvedValue(sampleList()),
      delete: overrides.listDelete ?? jest.fn(),
    },
    listItem: {
      findUnique: overrides.listItemFindUnique ?? jest.fn(),
      create: overrides.listItemCreate ?? jest.fn(),
      update: overrides.listItemUpdate ?? jest.fn(),
      delete: overrides.listItemDelete ?? jest.fn(),
    },
    listTemplate: {
      findUnique: overrides.listTemplateFindUnique ?? jest.fn(),
      create: overrides.listTemplateCreate ?? jest.fn().mockResolvedValue({ id: "tpl-1" }),
      delete: overrides.listTemplateDelete ?? jest.fn(),
    },
    $transaction: jest.fn(async (arg: unknown) => {
      if (typeof arg === "function") {
        return (arg as (tx: unknown) => unknown)(prisma);
      }
      return Promise.all(arg as Promise<unknown>[]);
    }),
  };
  return { service: new ListsService(prisma), prisma };
}

describe("ListsService", () => {
  describe("listLists", () => {
    it("lanza NotFoundException si el usuario no es participante del plan", async () => {
      const { service } = buildService({});
      await expect(service.listLists("stranger", "plan-1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("createList", () => {
    it("lanza ForbiddenException si quien crea no está confirmado", async () => {
      const { service } = buildService({});
      await expect(service.createList("user-3", "plan-1", { title: "Compra" })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("lanza BadRequestException si no hay título ni templateId", async () => {
      const { service } = buildService({});
      await expect(service.createList("owner", "plan-1", {})).rejects.toThrow(BadRequestException);
    });

    it("crea una lista vacía con el título dado", async () => {
      const listCreate = jest.fn().mockResolvedValue(sampleList({ title: "Compra" }));
      const { service } = buildService({ listCreate });
      const result = await service.createList("owner", "plan-1", { title: "Compra" });
      expect(result.title).toBe("Compra");
      expect(listCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: { planId: "plan-1", title: "Compra" } }),
      );
    });

    it("lanza NotFoundException si la plantilla no existe o no es del usuario", async () => {
      const listTemplateFindUnique = jest.fn().mockResolvedValue({ id: "tpl-1", userId: "other-user", items: [] });
      const { service } = buildService({ listTemplateFindUnique });
      await expect(service.createList("owner", "plan-1", { templateId: "tpl-1" })).rejects.toThrow(
        NotFoundException,
      );
    });

    it("crea la lista con el título y los elementos de la plantilla", async () => {
      const listTemplateFindUnique = jest.fn().mockResolvedValue({
        id: "tpl-1",
        userId: "owner",
        title: "Qué llevar",
        items: [{ text: "Toalla", order: 0 }, { text: "Crema solar", order: 1 }],
      });
      const listCreate = jest.fn().mockResolvedValue(
        sampleList({ title: "Qué llevar", templateId: "tpl-1" }),
      );
      const { service } = buildService({ listTemplateFindUnique, listCreate });
      const result = await service.createList("owner", "plan-1", { templateId: "tpl-1" });
      expect(result.title).toBe("Qué llevar");
      expect(listCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "Qué llevar",
            templateId: "tpl-1",
            items: { create: [{ text: "Toalla", done: false, order: 0 }, { text: "Crema solar", done: false, order: 1 }] },
          }),
        }),
      );
    });
  });

  describe("deleteList / items", () => {
    it("lanza ForbiddenException si quien borra no está confirmado", async () => {
      const { service } = buildService({});
      await expect(service.deleteList("user-3", "plan-1", "list-1")).rejects.toThrow(ForbiddenException);
    });

    it("lanza NotFoundException si la lista no pertenece al plan", async () => {
      const listFindUnique = jest.fn().mockResolvedValue(sampleList({ planId: "other-plan" }));
      const { service } = buildService({ listFindUnique });
      await expect(service.deleteList("owner", "plan-1", "list-1")).rejects.toThrow(NotFoundException);
    });

    it("lanza NotFoundException si el elemento no pertenece a la lista", async () => {
      const listItemFindUnique = jest.fn().mockResolvedValue({ id: "item-1", listId: "other-list" });
      const { service } = buildService({ listItemFindUnique });
      await expect(service.updateItem("owner", "plan-1", "list-1", "item-1", { done: true })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("saveAsTemplate / unsaveTemplate", () => {
    it("lanza BadRequestException si la lista ya está guardada como plantilla", async () => {
      const listFindUnique = jest.fn().mockResolvedValue(sampleList({ templateId: "tpl-1" }));
      const { service } = buildService({ listFindUnique });
      await expect(service.saveAsTemplate("owner", "plan-1", "list-1")).rejects.toThrow(BadRequestException);
    });

    it("crea la plantilla y enlaza la lista", async () => {
      const listFindUnique = jest.fn().mockResolvedValue(
        sampleList({ items: [{ id: "i1", text: "Toalla", done: false, order: 0 }] }),
      );
      const listTemplateCreate = jest.fn().mockResolvedValue({ id: "tpl-new" });
      const listUpdate = jest.fn().mockResolvedValue(sampleList({ templateId: "tpl-new" }));
      const { service, prisma } = buildService({ listFindUnique, listTemplateCreate, listUpdate });
      await service.saveAsTemplate("owner", "plan-1", "list-1");
      expect(listTemplateCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: "owner", title: "Compra" }),
        }),
      );
      expect(prisma.list.update).toHaveBeenCalledWith({ where: { id: "list-1" }, data: { templateId: "tpl-new" } });
    });

    it("lanza BadRequestException si la lista no está guardada como plantilla", async () => {
      const { service } = buildService({});
      await expect(service.unsaveTemplate("owner", "plan-1", "list-1")).rejects.toThrow(BadRequestException);
    });

    it("lanza ForbiddenException si la plantilla enlazada es de otro usuario", async () => {
      const listFindUnique = jest.fn().mockResolvedValue(sampleList({ templateId: "tpl-1" }));
      const listTemplateFindUnique = jest.fn().mockResolvedValue({ id: "tpl-1", userId: "other-user" });
      const { service } = buildService({ listFindUnique, listTemplateFindUnique });
      await expect(service.unsaveTemplate("owner", "plan-1", "list-1")).rejects.toThrow(ForbiddenException);
    });

    it("borra la plantilla y desenlaza la lista cuando es del propio usuario", async () => {
      const listFindUnique = jest.fn().mockResolvedValue(sampleList({ templateId: "tpl-1" }));
      const listTemplateFindUnique = jest.fn().mockResolvedValue({ id: "tpl-1", userId: "owner" });
      const { service, prisma } = buildService({ listFindUnique, listTemplateFindUnique });
      await service.unsaveTemplate("owner", "plan-1", "list-1");
      expect(prisma.listTemplate.delete).toHaveBeenCalledWith({ where: { id: "tpl-1" } });
    });
  });
});
