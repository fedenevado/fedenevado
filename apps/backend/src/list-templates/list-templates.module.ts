import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ListTemplatesController } from "./list-templates.controller";
import { ListTemplatesService } from "./list-templates.service";

@Module({
  imports: [AuthModule],
  controllers: [ListTemplatesController],
  providers: [ListTemplatesService],
  exports: [ListTemplatesService],
})
export class ListTemplatesModule {}
