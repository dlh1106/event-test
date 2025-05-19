// /home/dlh1106/nodetest/gate-server/src/auth/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
// 'jwt'는 gate-server의 JwtStrategy에서 PassportStrategy(Strategy, 'jwt')로 명명하거나,
// PassportStrategy(Strategy)로만 했을 경우 기본 이름인 'jwt'를 사용합니다.
export class JwtAuthGuard extends AuthGuard('jwt') {}