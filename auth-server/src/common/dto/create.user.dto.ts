import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; // Swagger 문서화를 위해 추가

export class CreateUserDto {
  @ApiProperty({ example: '홍길동', description: '사용자 이름' })
  @IsString({ message: '이름은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '이름을 입력해주세요.' })
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: 'gildong123', description: '로그인 ID' })
  @IsString()
  @IsNotEmpty({ message: '사용자 ID를 입력해주세요.' })
  @MinLength(4, { message: '사용자 ID는 최소 4자 이상이어야 합니다.' })
  @MaxLength(20)
  userId: string;

  @ApiProperty({ example: 'password123!', description: '비밀번호 (최소 8자, 영문, 숫자, 특수문자 포함)' })
  @IsString()
  @IsNotEmpty({ message: '비밀번호를 입력해주세요.' })
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  // @Matches(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{8,}$/, {
  //   message: '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.',
  // }) // 필요에 따라 주석 해제하여 사용
  password!: string; // 서비스 로직에서 필수이므로 ! 추가 또는 optional 제거

  @ApiProperty({ example: 'gildong@example.com', description: '이메일 주소' })
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  @IsNotEmpty({ message: '이메일을 입력해주세요.' })
  email: string;

  @ApiProperty({ example: '010-1234-5678', description: '전화번호 (선택 사항)', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phoneNumber?: string;
}