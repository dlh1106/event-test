import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Coupon, CouponDocument } from './entities/coupon.schema';
import { CreateCouponDto } from '../common/dto/create.coupon.dto';

@Injectable()
export class CouponService {
  constructor(
    @InjectModel(Coupon.name) private readonly couponModel: Model<CouponDocument>,
  ) {}

  // 쿠폰 생성
  async createCoupon(createCouponDto: CreateCouponDto): Promise<Coupon> {
    const existingCoupon = await this.couponModel.findOne({ code: createCouponDto.code }).exec();
    if (existingCoupon) {
      throw new ConflictException(`쿠폰 코드 '${createCouponDto.code}'가 이미 존재합니다.`);
    }
    const coupon = new this.couponModel({
      ...createCouponDto,
      isActive: createCouponDto.isActive !== undefined ? createCouponDto.isActive : true, // 기본값 설정
    });
    return coupon.save();
  }

  // 쿠폰 사용 (적용)
  async applyCoupon(code: string, userId: string): Promise<Coupon> {
    const coupon = await this.couponModel.findOne({ code }).exec();

    if (!coupon) {
      throw new NotFoundException(`쿠폰 코드 '${code}'를 찾을 수 없습니다.`);
    }
    if (coupon.usedBy) {
      throw new BadRequestException(`쿠폰 코드 '${code}'는 이미 사용되었습니다.`);
    }
    if (!coupon.isActive) {
      throw new BadRequestException(`쿠폰 코드 '${code}'는 활성 상태가 아닙니다.`);
    }
    if (new Date(coupon.expiryDate) < new Date()) {
      throw new BadRequestException(`쿠폰 코드 '${code}'는 만료되었습니다.`);
    }

    coupon.usedBy = userId;
    coupon.usedAt = new Date();
    coupon.isActive = false; // 사용 후 비활성화
    return coupon.save();
  }

  // 쿠폰 코드로 조회
  async findCouponByCode(code: string): Promise<Coupon | null> {
    const coupon = await this.couponModel.findOne({ code }).exec();
    if (!coupon) {
      throw new NotFoundException(`쿠폰 코드 '${code}'를 찾을 수 없습니다.`);
    }
    return coupon;
  }

  // 활성 쿠폰 전체 조회
  async findAllActiveCoupons(): Promise<Coupon[]> {
    return this.couponModel.find({ isActive: true, expiryDate: { $gte: new Date() } }).exec();
  }
}
