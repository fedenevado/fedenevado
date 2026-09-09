import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_ADMIN_CLIENT = "SUPABASE_ADMIN_CLIENT";
export const SUPABASE_AUTH_CLIENT = "SUPABASE_AUTH_CLIENT";

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SUPABASE_ADMIN_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createClient(config.getOrThrow<string>("SUPABASE_URL"), config.getOrThrow<string>("SUPABASE_SERVICE_ROLE_KEY"), {
          auth: { autoRefreshToken: false, persistSession: false },
        }),
    },
    {
      provide: SUPABASE_AUTH_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createClient(config.getOrThrow<string>("SUPABASE_URL"), config.getOrThrow<string>("SUPABASE_ANON_KEY"), {
          auth: { autoRefreshToken: false, persistSession: false },
        }),
    },
  ],
  exports: [SUPABASE_ADMIN_CLIENT, SUPABASE_AUTH_CLIENT],
})
export class SupabaseModule {}
