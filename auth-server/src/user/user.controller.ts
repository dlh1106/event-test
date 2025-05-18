import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Delete,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
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
import { LoginUserDto } from '../common/dto/login.user.dto';
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

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그인' })
  @ApiBody({ type: LoginUserDto })
  @ApiResponse({
    status: 200,
    description: '로그인 성공, 액세스 토큰 발급',
    schema: {
      properties: {
        accessToken: { type: 'string' },
        user: { $ref: '#/components/schemas/User' }, // User 스키마 참조 (passwordHash 제외)
      },
    },
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async login(@Body() loginUserDto: LoginUserDto) {
    return this.userService.login(loginUserDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: '로그아웃' })
  @ApiResponse({ status: 200, description: '로그아웃 성공' })
  async logout(@Request() req) {
    // JWT는 stateless이므로 서버측에서 특별한 작업은 없을 수 있으나,
    // 필요시 토큰 블랙리스트 등에 req.user.userId (또는 sub)를 활용 가능
    return this.userService.logout(req.user.userId);
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
