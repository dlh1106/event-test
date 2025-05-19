import { Module } from '@nestjs/common';
import { EventModule } from './event/event.module';
import { CouponModule } from './coupon/coupon.module'; // PointModule -> CouponModule
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    EventModule,
    CouponModule,
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://mongo:27017/',
      // docker-compose.yml에서 MONGODB_URI=mongodb://mongo:27017/event_db 로 설정됨
    ),
  ],
})
export class AppModule {}
