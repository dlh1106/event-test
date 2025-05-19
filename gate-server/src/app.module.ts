import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios'; // HttpModule 임포트
import { AppController } from './app.controller'; // AppController 임포트


@Module({
  imports: [HttpModule], // HttpModule 추가
  controllers: [AppController], // AppController 추가
})
export class AppModule {}