import {
  Controller,
  All, // 모든 HTTP 메소드를 처리하기 위해 All 데코레이터 사용
  Req, // Request 객체에 접근하기 위해 Req 데코레이터 사용
  Res, // Response 객체에 접근하기 위해 Res 데코레이터 사용
  Body, // 요청 본문에 접근하기 위해 Body 데코레이터 사용
  Param, // URL 파라미터에 접근하기 위해 Param 데코레이터 사용
  Query, // 쿼리 파라미터에 접근하기 위해 Query 데코레이터 사용
  Get, Post, Put, Delete, // 개별 HTTP 메소드 데코레이터 추가
  Headers, // 헤더에 접근하기 위해 Headers 데코레이터 사용
  HttpStatus, // HTTP 상태 코드를 사용하기 위해 임포트
  UseGuards, // UseGuards 데코레이터 임포트
  Logger,
  Patch, // Logger 임포트
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiConsumes, ApiProduces, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger'; // Swagger 데코레이터 임포트
import { HttpService } from '@nestjs/axios'; // HttpService 임포트
import { Request, Response, NextFunction } from 'express'; // Express Request, Response, NextFunction 타입 임포트
import { catchError, map } from 'rxjs/operators'; // RxJS 오퍼레이터 임포트
import { firstValueFrom } from 'rxjs'; // Observable을 Promise로 변환하기 위해 임포트
import { JwtAuthGuard } from './auth/jwt.auth.guard'; // JwtAuthGuard 임포트
import { RolesGuard } from './auth/roles.guard'; // RolesGuard 임포트
// import { Roles } from './auth/roles.decorator'; // 필요시 Roles 데코레이터 임포트

// Swagger 설명에 사용될 서비스 URL 상수 정의
const AUTH_SERVICE_URL_FOR_SWAGGER = process.env.AUTH_SERVICE_URL || 'http://auth-server:3001';
const EVENT_SERVICE_URL_FOR_SWAGGER = process.env.EVENT_SERVICE_URL || 'http://event-server:3002';

@ApiTags('API Gateway - Proxy')
@Controller()
export class AppController {
  // 백엔드 서비스 주소 (예시, 실제 환경에서는 환경 변수 사용 권장)
  // Docker Compose 서비스 이름과 내부 포트를 사용하도록 수정
  // 이 URL들은 _doProxy 내부에서만 사용되므로, Swagger 설명용 상수와 별개로 둡니다.
  private readonly AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-server:3001';
  private readonly EVENT_SERVICE_URL = process.env.EVENT_SERVICE_URL || 'http://event-server:3002';

  private readonly logger = new Logger(AppController.name); // Logger 인스턴스 생성

  constructor(private readonly httpService: HttpService) {}

  // 공통 프록시 로직을 위한 private 헬퍼 메소드
  private async _doProxy(
    targetServiceBaseUrl: string,
    backendPathSegment: string, // 백엔드 서비스 내에서의 경로 (예: "event" 또는 "event/123")
    request: Request,
    response: Response,
    body: any,
    headers: any,
    queryParams: any, // 쿼리 파라미터
  ) {
    // targetServiceBaseUrl은 http://event-server:3000 과 같은 형태여야 합니다 (후행 슬래시 없음).
    // backendPathSegment는 "event" 또는 "event/123" 과 같은 형태여야 합니다 (선행 슬래시 없음).
    const targetUrl = `${targetServiceBaseUrl}/${backendPathSegment}`;
    const method = request.method.toLowerCase(); // 요청 메소드 (소문자로)

    // request.user는 JwtAuthGuard가 성공적으로 통과한 경우에만 채워집니다.
    this.logger.debug(
      `Proxying ${method.toUpperCase()} ${request.originalUrl} to ${targetUrl} (queryParams: ${JSON.stringify(queryParams)}) for user: ${request.user?.['userId']} (Role: ${request.user?.['role']})`,
    );

    const headersToForward = { ...headers };
    delete headersToForward.host; // 호스트 헤더 제거
    // Content-Length 헤더는 httpService가 자동으로 계산하도록 두거나, 필요시 명시적으로 설정/제거합니다.
    // delete headersToForward['content-length']; // 필요에 따라 content-length 헤더 제거

    try {
      const backendResponseObservable = this.httpService.request({
        method: method as any,
        url: targetUrl,
        headers: headersToForward,
        data: body,
        timeout: 15000,
        params: queryParams,
        responseType: 'arraybuffer', // 다양한 응답 타입(특히 바이너리)을 제대로 처리하기 위함
      }).pipe(
        map(res => ({
          status: res.status,
          data: res.data,
          headers: res.headers, // 백엔드 응답 헤더 전달
        })),
        catchError(err => {
          const status = err.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
          const data = err.response?.data || { message: 'Internal Server Error from backend' };
          if (!response.headersSent) {
            // 백엔드에서 받은 에러의 Content-Type을 확인하고 설정하거나 기본 JSON으로 설정
            const contentType = err.response?.headers?.['content-type'] || 'application/json';
            response.setHeader('Content-Type', contentType);
            response.status(status).send(data);
          }
          throw err;
        }),
      );

      const backendResponse = await firstValueFrom(backendResponseObservable);

      // 백엔드로부터 받은 헤더를 클라이언트에 설정
      Object.entries(backendResponse.headers).forEach(([key, value]) => {
        // 특정 헤더는 NestJS/Express가 자동으로 처리하므로 제외할 수 있음
        if (key.toLowerCase() !== 'transfer-encoding' && key.toLowerCase() !== 'connection') {
          response.setHeader(key, value as string | string[]);
        }
      });

      if (!response.headersSent) {
        response.status(backendResponse.status).send(backendResponse.data);
      }
    } catch (error) {
      this.logger.error(`Proxy request to ${targetUrl} failed: ${error.message}`, error.stack);
      if (!response.headersSent) {
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ message: 'Proxy Error' });
      }
    }
  }

  // --- Auth Service Proxies ---

  // Auth Service - User Controller - Public Endpoints
  @Post('/auth/public/user/signup')
  @ApiOperation({ summary: '공개 회원가입 프록시 (POST /auth/public/user/signup)' })
  @ApiBody({
    description: '회원가입 정보 (CreateUserDto 형식)',
    type: Object,
    examples: { example1: { value: { name: "홍길동", userId: "gildong", email: "gildong@example.com", password: "password123", phoneNumber: "010-1234-5678", role: "USER" } } }
  })
  @ApiConsumes('application/json')
  @ApiProduces('application/json', '*/*')
  async proxyUserSignUp(@Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
    await this._doProxy(this.AUTH_SERVICE_URL, 'user/signup', req, res, body, headers, queryParams);
  }

  // Auth Service - Auth Controller - Public Endpoints
  @Post('/auth/public/auth/login')
  @ApiOperation({ summary: '공개 로그인 프록시 (POST /auth/public/auth/login)' })
  @ApiBody({
    description: '로그인 정보 (LoginUserDto 형식)',
    type: Object,
    examples: { example1: { value: { userId: "gildong", password: "password123" } } }
  })
  @ApiConsumes('application/json')
  @ApiProduces('application/json', '*/*')
  async proxyUserLogin(@Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
    await this._doProxy(this.AUTH_SERVICE_URL, 'auth/login', req, res, body, headers, queryParams);
  }

  // 예: /auth/login, /auth/register 등 인증이 필요 없는 Auth 서비스 API
  @ApiOperation({
    summary: '공개 인증 서비스 엔드포인트 프록시 (모든 HTTP 메소드)',
    description: `/auth/public/* 경로의 요청을 인증 서비스(${AUTH_SERVICE_URL_FOR_SWAGGER})로 프록시합니다. 게이트웨이에서 인증이 필요하지 않습니다.`,
  })
  // @All('/auth/public/*path') // 예: /auth/public/login, /auth/public/users/exists
  // async proxyAuthPublic(@Param('path') subpath: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
  //   await this._doProxy(this.AUTH_SERVICE_URL, subpath, req, res, body, headers, queryParams);
  // }
  @Get('/auth/public/*path') @ApiConsumes('*/*') @ApiProduces('application/json', '*/*')
  async proxyAuthPublicGet(@Param('path') subpath: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
    await this._doProxy(this.AUTH_SERVICE_URL, subpath, req, res, body, headers, queryParams);
  }
  @Post('/auth/public/*path') @ApiConsumes('application/json', 'application/x-www-form-urlencoded', 'multipart/form-data', '*/*') @ApiProduces('application/json', '*/*')
  async proxyAuthPublicPost(@Param('path') subpath: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
    await this._doProxy(this.AUTH_SERVICE_URL, subpath, req, res, body, headers, queryParams);
  }
  @Put('/auth/public/*path') @ApiConsumes('application/json', 'application/x-www-form-urlencoded', 'multipart/form-data', '*/*') @ApiProduces('application/json', '*/*')
  async proxyAuthPublicPut(@Param('path') subpath: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
    await this._doProxy(this.AUTH_SERVICE_URL, subpath, req, res, body, headers, queryParams);
  }
  @Delete('/auth/public/*path') @ApiConsumes('*/*') @ApiProduces('application/json', '*/*')
  async proxyAuthPublicDelete(@Param('path') subpath: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
    await this._doProxy(this.AUTH_SERVICE_URL, subpath, req, res, body, headers, queryParams);
  }
  @Patch('/auth/public/*path') @ApiConsumes('application/json', 'application/x-www-form-urlencoded', 'multipart/form-data', '*/*') @ApiProduces('application/json', '*/*')
  async proxyAuthPublicPatch(@Param('path') subpath: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
    await this._doProxy(this.AUTH_SERVICE_URL, subpath, req, res, body, headers, queryParams);
  }

  // 예: /auth/me, /auth/refresh 등 인증이 필요한 Auth 서비스 API
  @ApiOperation({
    summary: '보안 인증 서비스 엔드포인트 프록시 (모든 HTTP 메소드)',
    description: `/auth/secure/* 경로의 요청을 인증 서비스(${AUTH_SERVICE_URL_FOR_SWAGGER})로 프록시합니다. 게이트웨이에서 JWT 인증 및 역할 확인(해당하는 경우)이 필요합니다.`,
  })
  // @Roles('user', 'admin') // 필요에 따라 특정 역할 지정
  // @All('/auth/secure/*path') // 예: /auth/secure/me, /auth/secure/change-password
  // async proxyAuthSecure(@Param('path') subpath: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
  //   await this._doProxy(this.AUTH_SERVICE_URL, subpath, req, res, body, headers, queryParams);
  // }
  @Get('/auth/secure/*path') @ApiHeader({ name: 'Authorization', description: 'Bearer token for authentication', required: true }) @ApiConsumes('*/*') @ApiProduces('application/json', '*/*') @UseGuards(JwtAuthGuard, RolesGuard)
  async proxyAuthSecureGet(@Param('path') subpath: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
    await this._doProxy(this.AUTH_SERVICE_URL, subpath, req, res, body, headers, queryParams);
  }
  @Post('/auth/secure/*path') @ApiHeader({ name: 'Authorization', description: 'Bearer token for authentication', required: true }) @ApiConsumes('application/json', 'application/x-www-form-urlencoded', 'multipart/form-data', '*/*') @ApiProduces('application/json', '*/*') @UseGuards(JwtAuthGuard, RolesGuard)
  async proxyAuthSecurePost(@Param('path') subpath: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
    await this._doProxy(this.AUTH_SERVICE_URL, subpath, req, res, body, headers, queryParams);
  }
  @Put('/auth/secure/*path') @ApiHeader({ name: 'Authorization', description: 'Bearer token for authentication', required: true }) @ApiConsumes('application/json', 'application/x-www-form-urlencoded', 'multipart/form-data', '*/*') @ApiProduces('application/json', '*/*') @UseGuards(JwtAuthGuard, RolesGuard)
  async proxyAuthSecurePut(@Param('path') subpath: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
    await this._doProxy(this.AUTH_SERVICE_URL, subpath, req, res, body, headers, queryParams);
  }
  @Delete('/auth/secure/*path') @ApiHeader({ name: 'Authorization', description: 'Bearer token for authentication', required: true }) @ApiConsumes('*/*') @ApiProduces('application/json', '*/*') @UseGuards(JwtAuthGuard, RolesGuard)
  async proxyAuthSecureDelete(@Param('path') subpath: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
    await this._doProxy(this.AUTH_SERVICE_URL, subpath, req, res, body, headers, queryParams);
  }
  @Patch('/auth/secure/*path') @ApiHeader({ name: 'Authorization', description: 'Bearer token for authentication', required: true }) @ApiConsumes('application/json', 'application/x-www-form-urlencoded', 'multipart/form-data', '*/*') @ApiProduces('application/json', '*/*') @UseGuards(JwtAuthGuard, RolesGuard)
  async proxyAuthSecurePatch(@Param('path') subpath: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
    await this._doProxy(this.AUTH_SERVICE_URL, subpath, req, res, body, headers, queryParams);
  }

  // --- Event Service Proxies ---

  // Event Service - Public Endpoints
  @Get('/event/public/event')
  @ApiOperation({ summary: '공개 모든 이벤트 조회 프록시 (GET /event/public/event)' })
  @ApiProduces('application/json', '*/*')
  async proxyGetAllEventsPublic(@Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
    await this._doProxy(this.EVENT_SERVICE_URL, 'event', req, res, body, headers, queryParams);
  }

  @Get('/event/public/event/:id')
  @ApiOperation({ summary: '공개 특정 이벤트 조회 프록시 (GET /event/public/event/{id})' })
  @ApiParam({ name: 'id', description: '이벤트 ID', type: String, required: true })
  @ApiProduces('application/json', '*/*')
  async proxyGetEventByIdPublic(
    @Param('id') id: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any
  ) {
    await this._doProxy(this.EVENT_SERVICE_URL, `event/${id}`, req, res, body, headers, queryParams);
  }

  // Event Service - Secure Endpoints (Authentication Required)
  @Post('/event/secure/event')
  @ApiOperation({ summary: '보안 이벤트 생성 프록시 (POST /event/secure/event)' })
  @ApiHeader({ name: 'Authorization', description: 'Bearer token for authentication', required: true })
  @ApiBody({ description: '생성할 이벤트 데이터 (CreateEventDto 형식)', type: Object, examples: { example1: { value: { name: "New Event", description: "Event details", date: "2024-12-31T10:00:00Z", location: "Some Location" } } } })
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded', 'multipart/form-data', '*/*')
  @ApiProduces('application/json', '*/*')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async proxyCreateEventSecure(
    @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any
  ) {
    await this._doProxy(this.EVENT_SERVICE_URL, 'event', req, res, body, headers, queryParams);
  }

  @Put('/event/secure/event/:id')
  @ApiOperation({ summary: '보안 이벤트 수정 프록시 (PUT /event/secure/event/{id})' })
  @ApiHeader({ name: 'Authorization', description: 'Bearer token for authentication', required: true })
  @ApiParam({ name: 'id', description: '수정할 이벤트 ID', type: String, required: true })
  @ApiBody({ description: '수정할 이벤트 데이터 (UpdateEventDto 형식)', type: Object, examples: { example1: { value: { name: "Updated Event Name" } } } })
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded', 'multipart/form-data', '*/*')
  @ApiProduces('application/json', '*/*')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async proxyUpdateEventSecure(
    @Param('id') id: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any
  ) {
    await this._doProxy(this.EVENT_SERVICE_URL, `event/${id}`, req, res, body, headers, queryParams);
  }

  @Delete('/event/secure/event/:id')
  @ApiOperation({ summary: '보안 이벤트 삭제 프록시 (DELETE /event/secure/event/{id})' })
  @ApiHeader({ name: 'Authorization', description: 'Bearer token for authentication', required: true })
  @ApiParam({ name: 'id', description: '삭제할 이벤트 ID', type: String, required: true })
  @ApiProduces('application/json', '*/*') // 204 No Content는 본문이 없을 수 있지만, 에러는 JSON일 수 있음
  @UseGuards(JwtAuthGuard, RolesGuard)
  async proxyDeleteEventSecure(
    @Param('id') id: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any
  ) {
    await this._doProxy(this.EVENT_SERVICE_URL, `event/${id}`, req, res, body, headers, queryParams);
  }

  // Event Service - Coupon Controller - Public Endpoints
  @Get('/event/public/coupon/:code')
  @ApiOperation({ summary: '공개 쿠폰 코드로 상세 정보 조회 프록시 (GET /event/public/coupon/{code})' })
  @ApiParam({ name: 'code', description: '조회할 쿠폰 코드', type: String, required: true })
  @ApiProduces('application/json', '*/*')
  async proxyGetCouponByCodePublic(
    @Param('code') code: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any
  ) {
    await this._doProxy(this.EVENT_SERVICE_URL, `coupon/${code}`, req, res, body, headers, queryParams);
  }

  @Get('/event/public/coupon/active/all')
  @ApiOperation({ summary: '공개 모든 활성 쿠폰 목록 조회 프록시 (GET /event/public/coupon/active/all)' })
  @ApiProduces('application/json', '*/*')
  async proxyGetAllActiveCouponsPublic(@Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
    await this._doProxy(this.EVENT_SERVICE_URL, 'coupon/active/all', req, res, body, headers, queryParams);
  }

  // Event Service - Coupon Controller - Secure Endpoints
  @Post('/event/secure/coupon')
  @ApiOperation({ summary: '보안 새로운 쿠폰 생성 프록시 (POST /event/secure/coupon)' })
  @ApiHeader({ name: 'Authorization', description: 'Bearer token for authentication', required: true })
  @ApiBody({ description: '생성할 쿠폰 데이터 (CreateCouponDto 형식)', type: Object, examples: { example1: { value: { code: "SUMMER2024", discountType: "PERCENTAGE", discountValue: 10, expiryDate: "2024-12-31T23:59:59Z", description: "Summer sale coupon" } } } })
  @ApiConsumes('application/json')
  @ApiProduces('application/json', '*/*')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async proxyCreateCouponSecure(@Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
    await this._doProxy(this.EVENT_SERVICE_URL, 'coupon', req, res, body, headers, queryParams);
  }

  @Post('/event/secure/coupon/:code/apply')
  @ApiOperation({ summary: '보안 쿠폰 사용 (적용) 프록시 (POST /event/secure/coupon/{code}/apply)' })
  @ApiHeader({ name: 'Authorization', description: 'Bearer token for authentication', required: true })
  @ApiParam({ name: 'code', description: '사용할 쿠폰 코드', type: String, required: true })
  @ApiBody({ description: '쿠폰 적용 요청 데이터 (ApplyCouponDto 형식)', type: Object, examples: { example1: { value: { userId: "user123" } } } })
  @ApiConsumes('application/json')
  @ApiProduces('application/json', '*/*')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async proxyApplyCouponSecure(
    @Param('code') code: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any
  ) {
    await this._doProxy(this.EVENT_SERVICE_URL, `coupon/${code}/apply`, req, res, body, headers, queryParams);
  }

  // 여전히 필요한 경우, 명시적으로 정의되지 않은 다른 /event/public/* 경로를 위한 일반 프록시
  @ApiOperation({
    summary: '기타 공개 이벤트 서비스 엔드포인트 프록시 (모든 HTTP 메소드)',
    description: `명시적으로 정의되지 않은 /event/public/* 경로의 요청을 이벤트 서비스(${EVENT_SERVICE_URL_FOR_SWAGGER})로 프록시합니다. 게이트웨이에서 인증이 필요하지 않습니다.`,
  })
  // @All('/event/public/*path')
  // async proxyEventPublicFallback(@Param('path') subpath: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
  //   await this._doProxy(this.EVENT_SERVICE_URL, subpath, req, res, body, headers, queryParams);
  // }
  @Get('/event/public/*path') @ApiConsumes('*/*') @ApiProduces('application/json', '*/*')
  async proxyEventPublicFallbackGet(@Param('path') subpath: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
    await this._doProxy(this.EVENT_SERVICE_URL, subpath, req, res, body, headers, queryParams);
  }
  @Post('/event/public/*path') @ApiConsumes('application/json', 'application/x-www-form-urlencoded', 'multipart/form-data', '*/*') @ApiProduces('application/json', '*/*')
  async proxyEventPublicFallbackPost(@Param('path') subpath: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
    await this._doProxy(this.EVENT_SERVICE_URL, subpath, req, res, body, headers, queryParams);
  }
  @Put('/event/public/*path') @ApiConsumes('application/json', 'application/x-www-form-urlencoded', 'multipart/form-data', '*/*') @ApiProduces('application/json', '*/*')
  async proxyEventPublicFallbackPut(@Param('path') subpath: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
    await this._doProxy(this.EVENT_SERVICE_URL, subpath, req, res, body, headers, queryParams);
  }
  @Delete('/event/public/*path') @ApiConsumes('*/*') @ApiProduces('application/json', '*/*')
  async proxyEventPublicFallbackDelete(@Param('path') subpath: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
    await this._doProxy(this.EVENT_SERVICE_URL, subpath, req, res, body, headers, queryParams);
  }
  @Patch('/event/public/*path') @ApiConsumes('application/json', 'application/x-www-form-urlencoded', 'multipart/form-data', '*/*') @ApiProduces('application/json', '*/*')
  async proxyEventPublicFallbackPatch(@Param('path') subpath: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
    await this._doProxy(this.EVENT_SERVICE_URL, subpath, req, res, body, headers, queryParams);
  }

  // 여전히 필요한 경우, 명시적으로 정의되지 않은 다른 /event/secure/* 경로를 위한 일반 프록시
  @ApiOperation({
    summary: '기타 보안 이벤트 서비스 엔드포인트 프록시 (모든 HTTP 메소드)',
    description: `명시적으로 정의되지 않은 /event/secure/* 경로의 요청을 이벤트 서비스(${EVENT_SERVICE_URL_FOR_SWAGGER})로 프록시합니다. 게이트웨이에서 JWT 인증 및 역할 확인(해당하는 경우)이 필요합니다.`,
  })
  // @All('/event/secure/*path')
  // async proxyEventSecureFallback(@Param('path') subpath: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
  //   await this._doProxy(this.EVENT_SERVICE_URL, subpath, req, res, body, headers, queryParams);
  // }
  @Get('/event/secure/*path') @ApiHeader({ name: 'Authorization', description: 'Bearer token for authentication', required: true }) @ApiConsumes('*/*') @ApiProduces('application/json', '*/*') @UseGuards(JwtAuthGuard, RolesGuard)
  async proxyEventSecureFallbackGet(@Param('path') subpath: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
    await this._doProxy(this.EVENT_SERVICE_URL, subpath, req, res, body, headers, queryParams);
  }
  @Post('/event/secure/*path') @ApiHeader({ name: 'Authorization', description: 'Bearer token for authentication', required: true }) @ApiConsumes('application/json', 'application/x-www-form-urlencoded', 'multipart/form-data', '*/*') @ApiProduces('application/json', '*/*') @UseGuards(JwtAuthGuard, RolesGuard)
  async proxyEventSecureFallbackPost(@Param('path') subpath: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
    await this._doProxy(this.EVENT_SERVICE_URL, subpath, req, res, body, headers, queryParams);
  }
  @Put('/event/secure/*path') @ApiHeader({ name: 'Authorization', description: 'Bearer token for authentication', required: true }) @ApiConsumes('application/json', 'application/x-www-form-urlencoded', 'multipart/form-data', '*/*') @ApiProduces('application/json', '*/*') @UseGuards(JwtAuthGuard, RolesGuard)
  async proxyEventSecureFallbackPut(@Param('path') subpath: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
    await this._doProxy(this.EVENT_SERVICE_URL, subpath, req, res, body, headers, queryParams);
  }
  @Delete('/event/secure/*path') @ApiHeader({ name: 'Authorization', description: 'Bearer token for authentication', required: true }) @ApiConsumes('*/*') @ApiProduces('application/json', '*/*') @UseGuards(JwtAuthGuard, RolesGuard)
  async proxyEventSecureFallbackDelete(@Param('path') subpath: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
    await this._doProxy(this.EVENT_SERVICE_URL, subpath, req, res, body, headers, queryParams);
  }
  @Patch('/event/secure/*path') @ApiHeader({ name: 'Authorization', description: 'Bearer token for authentication', required: true }) @ApiConsumes('application/json', 'application/x-www-form-urlencoded', 'multipart/form-data', '*/*') @ApiProduces('application/json', '*/*') @UseGuards(JwtAuthGuard, RolesGuard)
  async proxyEventSecureFallbackPatch(@Param('path') subpath: string, @Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() queryParams: any) {
    await this._doProxy(this.EVENT_SERVICE_URL, subpath, req, res, body, headers, queryParams);
  }
}
