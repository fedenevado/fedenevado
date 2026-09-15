import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { FriendshipsModule } from "./friendships/friendships.module";
import { PlansModule } from "./plans/plans.module";
import { ExpensesModule } from "./expenses/expenses.module";
import { ListsModule } from "./lists/lists.module";
import { ListTemplatesModule } from "./list-templates/list-templates.module";
import { ChatModule } from "./chat/chat.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    FriendshipsModule,
    PlansModule,
    ExpensesModule,
    ListsModule,
    ListTemplatesModule,
    ChatModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
