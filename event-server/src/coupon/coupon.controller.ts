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
import { CouponService } from './coupon.service';
import { Coupon } from './entities/coupon.schema';
import { CreateCouponDto } from '../common/dto/create.coupon.dto';
import { ApplyCouponDto } from '../common/dto/apply.coupon.dto';

@ApiTags('Coupon')
@Controller('coupon')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  // 쿠폰 생성
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '새로운 쿠폰 생성' })
  @ApiBody({ type: CreateCouponDto })
  @ApiResponse({ status: 201, description: '쿠폰 생성 성공', type: Coupon })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 409, description: '쿠폰 코드 중복' })
  async createCoupon(
    @Body() createCouponDto: CreateCouponDto,
  ): Promise<Coupon> {
    return this.couponService.createCoupon(createCouponDto);
  }

  // 쿠폰 사용 (적용)
  @Post(':code/apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '쿠폰 사용 (적용)' })
  @ApiParam({ name: 'code', description: '사용할 쿠폰 코드' })
  @ApiBody({ type: ApplyCouponDto })
  @ApiResponse({ status: 200, description: '쿠폰 사용 성공', type: Coupon })
  @ApiResponse({ status: 400, description: '잘못된 요청 또는 쿠폰 사용 불가' })
  @ApiResponse({ status: 404, description: '쿠폰을 찾을 수 없음' })
  async applyCoupon(
    @Param('code') code: string,
    @Body() applyCouponDto: ApplyCouponDto,
  ): Promise<Coupon> {
    return this.couponService.applyCoupon(code, applyCouponDto.userId);
  }

  // 쿠폰 코드로 조회
  @Get(':code')
  @ApiOperation({ summary: '쿠폰 코드로 상세 정보 조회' })
  @ApiParam({ name: 'code', description: '조회할 쿠폰 코드' })
  @ApiResponse({ status: 200, description: '쿠폰 조회 성공', type: Coupon })
  @ApiResponse({ status: 404, description: '쿠폰을 찾을 수 없음' })
  async findCouponByCode(@Param('code') code: string): Promise<Coupon | null> {
    return this.couponService.findCouponByCode(code);
  }

  // 활성 쿠폰 전체 조회
  @Get('active/all')
  @ApiOperation({ summary: '모든 활성 쿠폰 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '활성 쿠폰 목록 조회 성공',
    type: [Coupon],
  })
  async findAllActiveCoupons(): Promise<Coupon[]> {
    return this.couponService.findAllActiveCoupons();
  }
}
