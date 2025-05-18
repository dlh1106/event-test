import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PointService } from './point.service';
import { Point, PointSchema } from './entities/point.schema';
import { PointController } from './point.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Point.name, schema: PointSchema }]),
  ],
  providers: [PointService],
  exports: [PointService],
  controllers: [PointController],
})
export class PointModule {}
