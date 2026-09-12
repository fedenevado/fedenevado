import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { FriendshipsController } from "./friendships.controller";
import { FriendshipsService } from "./friendships.service";

@Module({
  imports: [AuthModule],
  controllers: [FriendshipsController],
  providers: [FriendshipsService],
})
export class FriendshipsModule {}
