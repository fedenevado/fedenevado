import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

export const SUPABASE_ADMIN_CLIENT = "SUPABASE_ADMIN_CLIENT";
export const SUPABASE_AUTH_CLIENT = "SUPABASE_AUTH_CLIENT";

// Node 20 no expone WebSocket nativo (llega en Node 22+); sin esto,
// @supabase/supabase-js lanza "native WebSocket not found" al crear el cliente.
const realtime = { transport: WebSocket as unknown as typeof globalThis.WebSocket };

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SUPABASE_ADMIN_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createClient(config.getOrThrow<string>("SUPABASE_URL"), config.getOrThrow<string>("SUPABASE_SERVICE_ROLE_KEY"), {
          auth: { autoRefreshToken: false, persistSession: false },
          realtime,
        }),
    },
    {
      provide: SUPABASE_AUTH_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createClient(config.getOrThrow<string>("SUPABASE_URL"), config.getOrThrow<string>("SUPABASE_ANON_KEY"), {
          auth: { autoRefreshToken: false, persistSession: false },
          realtime,
        }),
    },
  ],
  exports: [SUPABASE_ADMIN_CLIENT, SUPABASE_AUTH_CLIENT],
})
export class SupabaseModule {}
