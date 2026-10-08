import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Detrás de un proxy inverso (Traefik de Coolify en producción) req.ip sería
  // la IP del proxy para todas las peticiones, y el rate-limit se compartiría
  // entre todos los usuarios. Solo se activa con TRUST_PROXY_HOPS: si el
  // backend se expone directamente, confiar en X-Forwarded-For permitiría
  // falsear la IP y saltarse el rate-limit.
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 0);
  if (trustProxyHops > 0) {
    app.set("trust proxy", trustProxyHops);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(",") : false,
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
}

bootstrap();
