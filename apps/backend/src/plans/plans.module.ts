import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PlansController } from "./plans.controller";
import { InvitationsController } from "./invitations.controller";
import { PlansService } from "./plans.service";

@Module({
  imports: [AuthModule],
  controllers: [PlansController, InvitationsController],
  providers: [PlansService],
})
export class PlansModule {}
