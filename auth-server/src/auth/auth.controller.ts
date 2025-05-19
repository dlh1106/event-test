import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginUserDto } from '../common/dto/login.user.dto';
import { User } from '../user/entities/user.schema';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
    return this.authService.login(loginUserDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: '로그아웃' })
  @ApiResponse({ status: 200, description: '로그아웃 성공' })
  async logout(@Request() req) {
    return this.authService.logout(req.user.userId);
  }
}
