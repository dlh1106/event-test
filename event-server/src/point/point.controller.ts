import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { PointService } from './point.service';
import { Point } from './entities/point.schema';

@ApiTags('Point')
@Controller('point')
export class PointController {
  constructor(private readonly pointService: PointService) {}

  // 포인트 적립
  @Post('add')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '포인트 적립' })
  @ApiBody({ type: Point })
  @ApiResponse({ status: 201, description: '포인트 적립 성공', type: Point })
  async addPoint(@Body() data: Partial<Point>): Promise<Point> {
    return this.pointService.addPoint(data);
  }

  // 포인트 사용
  @Post('use')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '포인트 사용(차감)' })
  @ApiBody({ schema: { example: { userId: 'user1', amount: 100, reason: 'use' } } })
  @ApiResponse({ status: 201, description: '포인트 사용(차감) 성공', type: Point })
  async usePoint(
    @Body('userId') userId: string,
    @Body('amount') amount: number,
    @Body('reason') reason?: string,
  ): Promise<Point> {
    return this.pointService.usePoint(userId, amount, reason);
  }

  // 포인트 조회
  @Get(':userId')
  @ApiOperation({ summary: '사용자별 포인트 내역 조회' })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  @ApiResponse({ status: 200, description: '포인트 내역 조회 성공', type: [Point] })
  async getPointsByUser(@Param('userId') userId: string): Promise<Point[]> {
    return this.pointService.getPointsByUser(userId);
  }
}
