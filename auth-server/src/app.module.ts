import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    UserModule,
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/',
      // docker-compose.yml에서 MONGODB_URI=mongodb://mongo:27017/auth_db 로 설정됨
    ),
    AuthModule,
  ],
})
export class AppModule {}
