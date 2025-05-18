import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User, UserDocument } from './entities/user.schema';

// DTOs (실제로는 src/user/dto/ 폴더에 별도의 파일로 분리하는 것이 좋습니다)
export interface CreateUserDto {
  name: string;
  userId: string;
  password?: string; // 회원가입 시에는 평문 비밀번호를 받습니다.
  email: string;
  phoneNumber?: string;
}

export interface LoginUserDto {
  userId: string;
  password?: string;
}

export interface UpdateUserDto {
  name?: string;
  password?: string; // 새 비밀번호 (평문)
  email?: string;
  phoneNumber?: string;
  // point?: number; // 포인트 수정은 별도 로직 또는 PointService에서 관리
}

export interface JwtPayload {
  userId: string;
  sub: string; // MongoDB _id
}

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
  ) {}

  // 회원가입
  async signUp(createUserDto: CreateUserDto): Promise<Omit<User, 'passwordHash'>> {
    const { userId, email, password, ...rest } = createUserDto;

    if (!password) {
      throw new ConflictException('비밀번호를 입력해주세요.');
    }

    const existingUser = await this.userModel.findOne({ $or: [{ userId }, { email }] }).exec();
    if (existingUser) {
      if (existingUser.userId === userId) {
        throw new ConflictException('이미 사용 중인 사용자 ID입니다.');
      }
      if (existingUser.email === email) {
        throw new ConflictException('이미 사용 중인 이메일입니다.');
      }
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = new this.userModel({
      ...rest,
      userId,
      email,
      passwordHash: hashedPassword,
    });

    try {
      const savedUser = await newUser.save();
      const { passwordHash, ...result } = savedUser.toObject();
      return result;
    } catch (error) {
      throw new InternalServerErrorException('회원가입 중 오류가 발생했습니다.');
    }
  }

  // 로그인
  async login(loginUserDto: LoginUserDto): Promise<{ accessToken: string; user: Omit<User, 'passwordHash'> }> {
    const { userId, password } = loginUserDto;
    if (!password) {
      throw new UnauthorizedException('비밀번호를 입력해주세요.');
    }

    const user = await this.userModel.findOne({ userId }).select('+passwordHash').exec();
    if (!user) {
      throw new UnauthorizedException('사용자 ID 또는 비밀번호가 잘못되었습니다.');
    }

    const isPasswordMatching = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordMatching) {
      throw new UnauthorizedException('사용자 ID 또는 비밀번호가 잘못되었습니다.');
    }

    const payload: JwtPayload = { userId: user.userId, sub: user._id.toString() };
    const accessToken = this.jwtService.sign(payload);

    const { passwordHash, ...userResult } = user.toObject();
    return { accessToken, user: userResult };
  }

  // 로그아웃 (JWT는 본질적으로 stateless, 클라이언트에서 토큰 삭제. 필요시 서버에서 블랙리스트 관리)
  async logout(userId: string): Promise<{ message: string }> {
    // 서버 측에서는 특별한 작업이 필요 없을 수 있으나, 로깅 등은 가능
    console.log(`User ${userId} requested logout.`);
    return { message: '로그아웃 요청이 처리되었습니다. 클라이언트에서 토큰을 삭제해주세요.' };
  }

  // 회원정보 수정 (인증된 사용자의 ID를 사용해야 함)
  async updateUser(authUserId: string, updateUserDto: UpdateUserDto): Promise<Omit<User, 'passwordHash'>> {
    if (updateUserDto.password) {
      const saltRounds = 10;
      (updateUserDto as any).passwordHash = await bcrypt.hash(updateUserDto.password, saltRounds);
      delete updateUserDto.password; // 평문 비밀번호는 DTO에서 제거
    }

    const updatedUser = await this.userModel.findOneAndUpdate(
      { userId: authUserId }, // 인증된 사용자의 userId로 검색
      { $set: updateUserDto },
      { new: true, runValidators: true },
    ).exec();

    if (!updatedUser) {
      throw new NotFoundException(`${authUserId} 사용자를 찾을 수 없습니다.`);
    }
    const { passwordHash, ...result } = updatedUser.toObject();
    return result;
  }

  // 회원탈퇴 (인증된 사용자의 ID를 사용해야 함)
  async deleteUser(authUserId: string): Promise<{ deleted: boolean; message?: string }> {
    const result = await this.userModel.deleteOne({ userId: authUserId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`${authUserId} 사용자를 찾을 수 없습니다.`);
    }
    return { deleted: true, message: '회원 탈퇴가 성공적으로 처리되었습니다.' };
  }

  // JWT payload로부터 사용자 정보 조회 (AuthGuard 등에서 사용)
  async validateUserByJwt(payload: JwtPayload): Promise<UserDocument | null> {
    return this.userModel.findById(payload.sub).exec();
  }

  // (추가) userId로 사용자 조회 (내부용 또는 특정 권한용)
  async findOneByUserId(userId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ userId }).exec();
  }
}
