import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Point, PointDocument } from './entities/point.schema';

@Injectable()
export class PointService {
  constructor(
    @InjectModel(Point.name) private readonly pointModel: Model<PointDocument>,
  ) {}

  // 포인트 적립
  async addPoint(data: Partial<Point>): Promise<Point> {
    const point = new this.pointModel(data);
    return point.save();
  }

  // 포인트 사용 (차감)
  async usePoint(
    userId: string,
    amount: number,
    reason = 'use',
  ): Promise<Point> {
    // 실제로는 사용자별 잔액 관리가 필요하지만, 예시로 기록만 남김
    const point = new this.pointModel({
      userId,
      amount: -Math.abs(amount),
      reason,
    });
    return point.save();
  }

  // 포인트 조회 (사용자별 전체 내역)
  async getPointsByUser(userId: string): Promise<Point[]> {
    return this.pointModel.find({ userId }).exec();
  }
}
