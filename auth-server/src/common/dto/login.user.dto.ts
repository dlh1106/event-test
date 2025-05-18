import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({ example: 'gildong123', description: '로그인 ID' })
  @IsString()
  @IsNotEmpty({ message: '사용자 ID를 입력해주세요.' })
  userId: string;

  @ApiProperty({ example: 'password123!', description: '비밀번호' })
  @IsString()
  @IsNotEmpty({ message: '비밀번호를 입력해주세요.' })
  // 실제 로그인 시에는 비밀번호 형식/길이 검증은 보통 회원가입 시에만 엄격하게 합니다.
  password!: string; // 서비스 로직에서 필수이므로 ! 추가 또는 optional 제거
}