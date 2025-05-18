import { Injectable } from '@nestjs/common';
import { User } from './entities/user.entity';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private readonly users: User[] = [
    new User(1, 'admin', 'admin123', ['admin']),
    new User(2, 'user', 'user123', ['user']),
  ];

  constructor(private readonly jwtService: JwtService) {}

  // 사용자 인증 (username과 password를 검증)
  validateUser(username: string, password: string): User | null {
    const user = this.users.find(
      (user) => user.username === username && user.password === password,
    );
    return user || null;
  }

  // JWT 토큰 생성
  generateJwtToken(user: User): string {
    const payload = { username: user.username, sub: user.id, roles: user.roles };
    return this.jwtService.sign(payload);
  }

  // JWT 토큰 검증
  verifyJwtToken(token: string): any {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}