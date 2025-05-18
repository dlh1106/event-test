// 예시: /home/dlh1106/nodetest/auth-server/src/user/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../../user/user.service'; // UserService import
import { JwtPayload } from '../../user/user.service'; // JwtPayload import
import { UserDocument } from '../../user/entities/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly userService: UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'YOUR_VERY_SECRET_KEY_AUTH_SERVER',
    });
  }

  async validate(payload: JwtPayload): Promise<UserDocument> {
    const user = await this.userService.validateUserByJwt(payload);
    if (!user) {
      throw new UnauthorizedException('유효하지 않은 토큰 또는 사용자를 찾을 수 없습니다.');
    }
    return user; // 이 객체가 @UseGuards(AuthGuard('jwt')) 사용 시 req.user에 할당됩니다.
  }
}
