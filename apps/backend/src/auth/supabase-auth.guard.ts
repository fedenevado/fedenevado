import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as jwt from "jsonwebtoken";
import type { Request } from "express";

export interface AuthenticatedUser {
  id: string;
  email: string;
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Falta el token de autenticación.");
    }

    const token = authHeader.slice("Bearer ".length);

    try {
      const payload = jwt.verify(token, this.config.getOrThrow<string>("SUPABASE_JWT_SECRET"), {
        algorithms: ["HS256"],
      }) as jwt.JwtPayload;

      if (!payload.sub) {
        throw new UnauthorizedException("Token inválido.");
      }

      request.user = { id: payload.sub, email: payload.email as string };
      return true;
    } catch {
      throw new UnauthorizedException("Token inválido o expirado.");
    }
  }
}
