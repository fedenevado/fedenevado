import { Module } from "@nestjs/common";
import { SupabaseModule } from "../supabase/supabase.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { SupabaseAuthGuard } from "./supabase-auth.guard";

@Module({
  imports: [SupabaseModule],
  controllers: [AuthController],
  providers: [AuthService, SupabaseAuthGuard],
  exports: [SupabaseAuthGuard],
})
export class AuthModule {}
