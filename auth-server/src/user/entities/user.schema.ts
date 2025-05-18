import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true }) // createdAt, updatedAt 자동 생성
export class User {
  @Prop({ required: true })
  name: string; // 회원명

  @Prop({ required: true, unique: true })
  userId: string; // 회원 ID (로그인 시 사용)

  @Prop({ required: true })
  passwordHash: string; // 비밀번호 (해시된 값 저장)

  @Prop({ required: true, unique: true })
  email: string; // 이메일

  @Prop()
  phoneNumber?: string; // 전화번호 (선택 사항)

  @Prop({ default: 0 })
  point: number; // 포인트
}

export const UserSchema = SchemaFactory.createForClass(User);
