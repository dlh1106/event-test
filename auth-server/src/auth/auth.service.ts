import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { LoginUserDto } from '../common/dto/login.user.dto';
import { User } from '../user/entities/user.schema';
import * as bcrypt from 'bcrypt';

// JwtPayload interface, to be used by JwtStrategy and other parts of the auth system
export interface JwtPayload {
  sub: string;    // MongoDB _id (Subject - 표준 클레임)
  userId: string; // 애플리케이션 사용자 ID
  role: string;   // 사용자 역할
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginUserDto: LoginUserDto): Promise<{ accessToken: string; user: Omit<User, 'passwordHash'> }> {
    const { userId, password } = loginUserDto;
    if (!password) {
      throw new UnauthorizedException('비밀번호를 입력해주세요.');
    }

    // UserService를 통해 passwordHash를 포함한 사용자 정보 조회
    const user = await this.userService.findUserForLogin(userId);
    if (!user) {
      throw new UnauthorizedException('사용자 ID 또는 비밀번호가 잘못되었습니다.');
    }

    const isPasswordMatching = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordMatching) {
      throw new UnauthorizedException('사용자 ID 또는 비밀번호가 잘못되었습니다.');
    }

    const payload: JwtPayload = { sub: user._id.toString(), userId: user.userId, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    // user는 Mongoose Document이므로 toObject()를 호출하여 순수 JavaScript 객체로 변환합니다.
    const { passwordHash, ...userResult } = user.toObject();
    return { accessToken, user: userResult };
  }

  async logout(userId: string): Promise<{ message: string }> {
    // 서버 측에서는 특별한 작업이 필요 없을 수 있으나, 로깅 등은 가능
    console.log(`User ${userId} requested logout.`);
    return { message: '로그아웃 요청이 처리되었습니다. 클라이언트에서 토큰을 삭제해주세요.' };
  }
}
