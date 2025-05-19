import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CouponDocument = Coupon & Document;

@Schema({ timestamps: true })
export class Coupon {
  @Prop({ required: true })
  code: string; // 쿠폰 코드 (고유해야 함)

  @Prop({ required: true, enum: ['percentage', 'fixed'] })
  type: 'percentage' | 'fixed'; // 쿠폰 타입 (예: 'percentage' 할인율, 'fixed' 고정 금액 할인)

  @Prop({ required: true })
  value: number; // 할인 값 (예: 10 (10%), 5000 (5000원))

  @Prop({ required: true })
  expiryDate: Date; // 쿠폰 만료일

  @Prop({ required: true, default: true })
  isActive: boolean; // 쿠폰 활성화 상태

  @Prop({ required: false })
  usedBy?: string; // 쿠폰을 사용한 사용자 ID (사용되지 않았으면 null 또는 undefined)

  @Prop({ required: false })
  usedAt?: Date; // 쿠폰 사용 일시 (사용되지 않았으면 null 또는 undefined)
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
