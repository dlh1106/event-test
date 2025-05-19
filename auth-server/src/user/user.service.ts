import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './entities/user.schema';
import { CreateUserDto } from '../common/dto/create.user.dto';
import { UpdateUserDto } from '../common/dto/update.user.dto';
import { JwtPayload } from '../auth/auth.service'; // JwtPayload import

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  // 회원가입
  async signUp(createUserDto: CreateUserDto): Promise<Omit<User, 'passwordHash'>> {
    const { name, userId, email, password, phoneNumber, role } = createUserDto;

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
      name,
      userId,
      email,
      passwordHash: hashedPassword,
      phoneNumber, // phoneNumber 추가
      role,        // role 추가 (DTO에 없으면 스키마 기본값 'USER' 사용됨)
    });

    try {
      const savedUser = await newUser.save();
      const { passwordHash, ...result } = savedUser.toObject();
      // phoneNumber가 DTO에 없었거나 null/undefined였다면 결과에서 제외
      if (result.phoneNumber === undefined) {
         delete result.phoneNumber;
      }
      return result;
    } catch (error) {
      throw new InternalServerErrorException('회원가입 중 오류가 발생했습니다.');
    }
  }

  // AuthService에서 로그인 시 사용자 정보 (passwordHash 포함) 조회를 위해 사용
  async findUserForLogin(userId: string): Promise<(UserDocument & { _id: Types.ObjectId }) | null> {
    // passwordHash를 명시적으로 선택
    return this.userModel.findOne({ userId }).select('+passwordHash').exec();
  }

  // 회원정보 수정 (인증된 사용자의 ID를 사용해야 함)
  async updateUser(authUserId: string, updateUserDto: UpdateUserDto): Promise<Omit<User, 'passwordHash'>> {
    const fieldsToUpdate: Partial<User> = {}; // DB에 업데이트할 필드들을 담을 객체

    // DTO에서 업데이트 가능한 필드들을 선택적으로 fieldsToUpdate 객체에 추가
    // 직접 할당하여 원치 않는 필드가 업데이트되는 것을 방지
    if (updateUserDto.name !== undefined) {
      fieldsToUpdate.name = updateUserDto.name;
    }
    if (updateUserDto.email !== undefined) {
      // 이메일 변경 시 중복 체크 로직 추가 가능 (signUp 참조)
      // const existingUserByEmail = await this.userModel.findOne({ email: updateUserDto.email, userId: { $ne: authUserId } }).exec();
      // if (existingUserByEmail) {
      //   throw new ConflictException('이미 사용 중인 이메일입니다.');
      // }
      fieldsToUpdate.email = updateUserDto.email;
    }
    if (updateUserDto.phoneNumber !== undefined) {
      fieldsToUpdate.phoneNumber = updateUserDto.phoneNumber;
    }
    // updateUserDto.role과 같이 역할 변경은 별도의 권한 관리 로직이 필요할 수 있음

    // 비밀번호 변경 요청이 있는 경우에만 처리
    if (updateUserDto.password) {
      if (updateUserDto.password.trim().length < 6) { // 예시: 최소 길이 검증
        throw new BadRequestException('새 비밀번호는 6자 이상이어야 합니다.');
      }
      const saltRounds = 10;
      fieldsToUpdate.passwordHash = await bcrypt.hash(updateUserDto.password, saltRounds);
    }

    // 실제로 업데이트할 내용이 있는지 확인
    if (Object.keys(fieldsToUpdate).length === 0) {
      throw new BadRequestException('수정할 내용이 없습니다.');
    }

    const updatedUser = await this.userModel.findOneAndUpdate(
      { userId: authUserId }, // 인증된 사용자의 userId로 검색
      { $set: fieldsToUpdate }, // 명시적으로 구성된 필드들만 업데이트
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
