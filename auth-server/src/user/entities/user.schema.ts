import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose'; // Types 임포트 추가

export type UserDocument = User & Document;
@Schema({ timestamps: true, collection: 'users' }) // createdAt, updatedAt 자동 생성 및 컬렉션 이름 명시
export class User {
  // Mongoose가 자동으로 생성하는 _id 필드를 명시적으로 선언 (타입스크립트 및 Swagger용)
  _id: Types.ObjectId;

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

  @Prop({ type: String, enum: ['USER', 'OPERATOR', 'AUDITOR', 'ADMIN'], default: 'USER' })
  role: string; // 사용자 역할 (기본값: 'USER')
}

export const UserSchema = SchemaFactory.createForClass(User);
