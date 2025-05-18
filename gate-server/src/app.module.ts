import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { RoutesModule } from './routes/index';

@Module({
  imports: [AuthModule, RoutesModule],
})
export class AppModule {}