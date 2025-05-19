import {
  Controller,
  Post,
  Body,
  Get,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  Put,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from './user.service';
import { CreateUserDto } from '../common/dto/create.user.dto';
import { UpdateUserDto } from '../common/dto/update.user.dto';
import { User } from './entities/user.schema'; // 스키마 직접 사용 또는 UserResponseDto 생성

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '회원가입' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: '회원가입 성공', type: User }) // passwordHash 제외된 User 타입 반환 명시 필요
  @ApiResponse({ status: 409, description: '이미 사용 중인 사용자 ID 또는 이메일' })
  async signUp(@Body() createUserDto: CreateUserDto) {
    // UserService.signUp은 passwordHash를 제외한 User 객체를 반환합니다.
    return this.userService.signUp(createUserDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 프로필 조회' })
  @ApiResponse({ status: 200, description: '프로필 조회 성공', type: User }) // passwordHash 제외된 User 타입
  @ApiResponse({ status: 401, description: '인증되지 않음' })
  async getProfile(@Request() req) {
    // req.user는 JwtStrategy의 validate 메서드에서 반환된 사용자 객체입니다.
    // passwordHash를 제외하고 반환하도록 처리합니다.
    const { passwordHash, ...userProfile } = req.user.toObject ? req.user.toObject() : req.user;
    return userProfile;
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 프로필 수정' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: '프로필 수정 성공', type: User }) // passwordHash 제외된 User 타입
  @ApiResponse({ status: 401, description: '인증되지 않음' })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.updateUser(req.user.userId, updateUserDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('profile')
  @HttpCode(HttpStatus.OK) // 또는 HttpStatus.NO_CONTENT (204)
  @ApiBearerAuth()
  @ApiOperation({ summary: '회원 탈퇴' })
  @ApiResponse({ status: 200, description: '회원 탈퇴 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않음' })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async deleteAccount(@Request() req) {
    return this.userService.deleteUser(req.user.userId);
  }
}
