import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsDateString,
  IsOptional,
  IsBoolean,
  Min,
} from 'class-validator';

export class CreateCouponDto {
  @ApiProperty({ example: 'SUMMER25', description: '고유 쿠폰 코드' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ enum: ['percentage', 'fixed'], example: 'percentage', description: '쿠폰 타입 (할인율 또는 고정 금액)' })
  @IsEnum(['percentage', 'fixed'])
  type: 'percentage' | 'fixed';

  @ApiProperty({ example: 25, description: '할인 값 (퍼센트 또는 금액)' })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiProperty({ example: '2024-12-31T23:59:59.000Z', description: '쿠폰 만료일' })
  @IsDateString()
  expiryDate: Date;

  @ApiProperty({ example: true, description: '쿠폰 활성화 여부', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}