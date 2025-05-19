// /home/dlh1106/nodetest/auth-server/src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../user/user.service';
import { JwtPayload } from './auth.service'; // auth.service.ts에 정의된 JwtPayload 사용
import { UserDocument } from '../user/entities/user.schema'; // 반환 타입으로 UserDocument 사용

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') { // 'jwt' 전략 명시적 이름 지정
  constructor(private readonly userService: UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Authorization: Bearer <token> 에서 토큰 추출
      ignoreExpiration: false, // 토큰 만료 무시 안 함
      // auth.module.ts의 JwtModule.register에 있는 secret과 동일해야 함
      secretOrKey: process.env.JWT_SECRET || 'YOUR_VERY_SECRET_KEY_AUTH_SERVER',
    });
  }

  async validate(payload: JwtPayload): Promise<UserDocument> {
    const user = await this.userService.validateUserByJwt(payload); // UserService를 통해 사용자 검증
    if (!user) {
      throw new UnauthorizedException('유효하지 않은 토큰이거나 사용자를 찾을 수 없습니다.');
    }
    return user; // 이 반환값이 request.user에 할당됨
  }
}