import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { EventModule } from './event/event.module';
import { PointModule } from './point/point.module';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    EventModule,
    PointModule,
    MongooseModule.forRoot('mongodb://localhost:27017'), // 여기에 MongoDB 연결 URI를 입력하세요.
  ],
  providers: [AppService],
})
export class AppModule {}
