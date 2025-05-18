// Event 객체용 dto 클래스

import {
  IsString,
  IsDate,
  IsNotEmpty,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty({ description: '이벤트명', example: '출석체크 이벤트' })
  @IsString()
  @IsNotEmpty()
  name: string; // 이벤트명

  @ApiProperty({ description: '이벤트 시작일', example: '2025-05-18T00:00:00.000Z', type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  startDate: Date; // 이벤트 시작일

  @ApiProperty({ description: '이벤트 종료일', example: '2025-05-25T23:59:59.000Z', type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  endDate: Date; // 이벤트 종료일

  @ApiProperty({ description: '보상 조건', example: '7일 연속 출석' })
  @IsString()
  @IsNotEmpty()
  rewardCondition: string; // 보상 조건

  @ApiPropertyOptional({ description: '이벤트 상태', example: 'active', enum: ['active', 'inactive', 'completed'] })
  @IsString()
  @IsIn(['active', 'inactive', 'completed'])
  status?: string; // 이벤트 상태
}