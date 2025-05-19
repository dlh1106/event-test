// /home/dlh1106/nodetest/gate-server/src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

// Define the structure of the JWT payload
// This MUST match what your auth-server puts in the token payload
export interface JwtPayload {
  sub: string; // User ID (subject) - often the user's unique identifier
  username: string; // Example field from auth-server's token
  role: string; // User role - This is the crucial field for RolesGuard
  iat?: number; // Issued at
  exp?: number; // Expiration time
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'), // Use ConfigService for JWT_SECRET
    });
  }

  async validate(payload: JwtPayload) {
    // Gate server trusts the payload once the token is verified.
    // It extracts necessary fields to populate request.user for subsequent guards/controllers.
    return { userId: payload.sub, username: payload.username, role: payload.role };
  }
}