import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ApplyCouponDto {
  @ApiProperty({ example: 'user123', description: '쿠폰을 적용하는 사용자 ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;
}