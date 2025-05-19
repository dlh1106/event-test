import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EventDocument = Event & Document;

@Schema({ timestamps: true, collection: 'events' }) // 생성 및 수정 시간 자동 관리
export class Event {
  @Prop({ required: true })
  name: string; // 이벤트명

  @Prop({ required: true })
  startDate: Date; // 이벤트 시작일

  @Prop({ required: true })
  endDate: Date; // 이벤트 종료일

  @Prop({ required: true })
  rewardCondition: string; // 보상 조건

  @Prop({
    required: true,
    enum: ['active', 'inactive', 'completed'],
    default: 'inactive',
  })
  status: string; // 이벤트 상태 (active, inactive, completed)
}

export const EventSchema = SchemaFactory.createForClass(Event);
