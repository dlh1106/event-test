import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PointDocument = Point & Document;

@Schema({ timestamps: true })
export class Point {
  @Prop({ required: true })
  userId: string; // 포인트를 지급받는 사용자 ID

  @Prop({ required: true })
  eventId: string; // 포인트가 지급된 이벤트 ID

  @Prop({ required: true })
  amount: number; // 지급된 포인트 양

  @Prop({ required: true, default: 'reward' })
  reason: string; // 지급 사유 (예: 'reward', 'bonus' 등)
}

export const PointSchema = SchemaFactory.createForClass(Point);
