import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsDate, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class RequestEventDto {
  @ApiPropertyOptional({ description: '이벤트명', example: '출석체크 이벤트' })
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '이벤트 상태', example: 'active', enum: ['active', 'inactive', 'completed'] })
  @IsString()
  @IsIn(['active', 'inactive', 'completed'])
  status?: string;

  @ApiPropertyOptional({ description: '이벤트 시작일', example: '2025-05-18T00:00:00.000Z', type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({ description: '이벤트 종료일', example: '2025-05-25T23:59:59.000Z', type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({ description: '보상 조건', example: '7일 연속 출석' })
  @IsString()
  rewardCondition?: string;
}