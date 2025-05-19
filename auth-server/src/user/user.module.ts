import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User, UserSchema } from './entities/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    PassportModule, // PassportModule은 @UseGuards(AuthGuard('jwt')) 등을 위해 필요할 수 있음
  ],
  providers: [
    UserService,
  ],
  controllers: [UserController],
  exports: [UserService], // UserService만 export (AuthModule에서 UserModule을 import하여 사용)
})
export class UserModule {}
