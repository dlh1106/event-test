import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module'; // UserService를 사용하기 위해 UserModule import
import { JwtStrategy } from './jwt.strategy'; // JwtStrategy 임포트

@Module({
  imports: [
    UserModule, // UserService를 AuthService에서 주입받아 사용하기 위함
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'YOUR_VERY_SECRET_KEY_AUTH_SERVER', // 중요: 실제 프로덕션에서는 환경 변수 사용!
      signOptions: { expiresIn: '1h' }, // 토큰 만료 시간 (예: 1시간)
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy, // JwtStrategy를 providers 배열에 추가
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtModule], // AuthService와 JwtModule을 다른 모듈에서 사용할 수 있도록 export
})
export class AuthModule {}
