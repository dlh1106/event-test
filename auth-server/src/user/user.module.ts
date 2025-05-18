import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User, UserSchema } from './entities/user.schema';
import { JwtStrategy } from '../common/jwt/jwt.strategy'; // 새로 생성한 JwtStrategy 임포트

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    PassportModule.register({ defaultStrategy: 'jwt' }), // 기본 전략을 jwt로 설정
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'YOUR_VERY_SECRET_KEY_AUTH_SERVER', // 중요: 실제 프로덕션에서는 환경 변수 사용!
      signOptions: { expiresIn: '1h' }, // 토큰 만료 시간 (예: 1시간)
    }),
  ],
  providers: [
    UserService,
    JwtStrategy, // JwtStrategy를 providers에 추가
  ],
  controllers: [UserController],
  exports: [UserService, PassportModule, JwtModule], // 다른 모듈에서 사용될 수 있도록 내보냄
})
export class UserModule {}
