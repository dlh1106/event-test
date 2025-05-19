import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CouponService } from './coupon.service';
import { Coupon, CouponSchema } from './entities/coupon.schema';
import { CouponController } from './coupon.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Coupon.name, schema: CouponSchema }]),
  ],
  providers: [CouponService],
  exports: [CouponService], // 다른 모듈에서 CouponService를 사용하려면 export
  controllers: [CouponController],
})
export class CouponModule {}
