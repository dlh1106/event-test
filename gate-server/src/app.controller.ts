import {
  Controller,
  All, // 모든 HTTP 메소드를 처리하기 위해 All 데코레이터 사용
  Req, // Request 객체에 접근하기 위해 Req 데코레이터 사용
  Res, // Response 객체에 접근하기 위해 Res 데코레이터 사용
  Body, // 요청 본문에 접근하기 위해 Body 데코레이터 사용
  Param, // URL 파라미터에 접근하기 위해 Param 데코레이터 사용
  Query, // 쿼리 파라미터에 접근하기 위해 Query 데코레이터 사용
  Headers, // 헤더에 접근하기 위해 Headers 데코레이터 사용
  HttpStatus, // HTTP 상태 코드를 사용하기 위해 임포트
  UseGuards, // UseGuards 데코레이터 임포트
  Logger, // Logger 임포트
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiConsumes, ApiProduces, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger'; // Swagger 데코레이터 임포트
import { HttpService } from '@nestjs/axios'; // HttpService 임포트
import { Request, Response, NextFunction } from 'express'; // Express Request, Response, NextFunction 타입 임포트
import { catchError, map } from 'rxjs/operators'; // RxJS 오퍼레이터 임포트
import { firstValueFrom } from 'rxjs'; // Observable을 Promise로 변환하기 위해 임포트
import { JwtAuthGuard } from './auth/jwt.auth.guard'; // JwtAuthGuard 임포트
import { RolesGuard } from './auth/roles.guard'; // RolesGuard 임포트

@ApiTags('API Gateway - Proxy')
@Controller()
export class AppController {
  // 백엔드 서비스 주소 (예시, 실제 환경에서는 환경 변수 사용 권장)
  // Docker Compose 서비스 이름과 내부 포트를 사용하도록 수정
  private readonly AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-server:3000';
  private readonly EVENT_SERVICE_URL = process.env.EVENT_SERVICE_URL || 'http://event-server:3000';

  private readonly logger = new Logger(AppController.name); // Logger 인스턴스 생성

  constructor(private readonly httpService: HttpService) {}

  // 공통 프록시 로직을 위한 private 헬퍼 메소드
  private async _doProxy(
    targetServiceBaseUrl: string,
    request: Request,
    response: Response,
    body: any,
    headers: any,
    query: any,
  ) {
    const path = request.originalUrl; // 원본 요청 경로 (쿼리 포함)
    const method = request.method.toLowerCase(); // 요청 메소드 (소문자로)
    const targetUrl = `${targetServiceBaseUrl}${path}`;

    // request.user는 JwtAuthGuard가 성공적으로 통과한 경우에만 채워집니다.
    this.logger.debug(
      `Proxying ${method.toUpperCase()} ${path} to ${targetUrl} for user: ${request.user?.['userId']} (Role: ${request.user?.['role']})`,
    );

    const headersToForward = { ...headers };
    delete headersToForward.host; // 호스트 헤더 제거
    // delete headersToForward['content-length']; // 필요에 따라 content-length 헤더 제거

    try {
      const backendResponseObservable = this.httpService.request({
        method: method as any,
        url: targetUrl,
        headers: headersToForward,
        data: body,
        params: query,
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

  // 예: /auth/login, /auth/register 등 인증이 필요 없는 Auth 서비스 API
  @ApiOperation({
    summary: '공개 인증 서비스 엔드포인트 프록시 (예: /auth/login, /auth/register)',
    description: `/auth/public으로 시작하는 요청을 인증 서비스(AUTH_SERVICE_URL)로 프록시합니다. 게이트웨이에서 인증이 필요하지 않습니다.`,
  })
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded', 'multipart/form-data', '*/*')
  @ApiProduces('application/json', '*/*')
  @All('/auth/public/*path') // 예: /auth/public/login, /auth/public/users/exists
  async proxyAuthPublic(@Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() query: any) {
    await this._doProxy(this.AUTH_SERVICE_URL, req, res, body, headers, query);
  }

  // 예: /auth/me, /auth/refresh 등 인증이 필요한 Auth 서비스 API
  @ApiOperation({
    summary: '보안 인증 서비스 엔드포인트 프록시 (예: /auth/me, /auth/refresh)',
    description: `/auth/secure로 시작하는 요청을 인증 서비스(AUTH_SERVICE_URL)로 프록시합니다. 게이트웨이에서 JWT 인증 및 역할 확인(해당하는 경우)이 필요합니다.`,
  })
  @ApiHeader({ name: 'Authorization', description: 'Bearer token for authentication', required: true })
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded', 'multipart/form-data', '*/*')
  @ApiProduces('application/json', '*/*')
  @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('user', 'admin') // 필요에 따라 특정 역할 지정
  @All('/auth/secure/*path') // 예: /auth/secure/me, /auth/secure/change-password
  async proxyAuthSecure(@Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() query: any) {
    await this._doProxy(this.AUTH_SERVICE_URL, req, res, body, headers, query);
  }

  // --- Event Service Proxies ---

  // 예: /event/list, /event/feed 등 인증이 필요 없는 Event 서비스 API
  @ApiOperation({
    summary: '공개 이벤트 서비스 엔드포인트 프록시 (예: /event/list)',
    description: `/event/public으로 시작하는 요청을 이벤트 서비스(EVENT_SERVICE_URL)로 프록시합니다. 게이트웨이에서 인증이 필요하지 않습니다.`,
  })
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded', 'multipart/form-data', '*/*')
  @ApiProduces('application/json', '*/*')
  @All('/event/public/*path')
  async proxyEventPublic(@Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() query: any) {
    await this._doProxy(this.EVENT_SERVICE_URL, req, res, body, headers, query);
  }

  // 예: /event/create, /event/:id/participate 등 인증이 필요한 Event 서비스 API
  @ApiOperation({
    summary: '보안 이벤트 서비스 엔드포인트 프록시 (예: /event/create)',
    description: `/event/secure로 시작하는 요청을 이벤트 서비스(EVENT_SERVICE_URL)로 프록시합니다. 게이트웨이에서 JWT 인증 및 역할 확인(해당하는 경우)이 필요합니다.`,
  })
  @ApiHeader({ name: 'Authorization', description: 'Bearer token for authentication', required: true })
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded', 'multipart/form-data', '*/*')
  @ApiProduces('application/json', '*/*')
  @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('user') // 필요에 따라 특정 역할 지정
  @All('/event/secure/*path')
  async proxyEventSecure(@Req() req: Request, @Res() res: Response, @Body() body: any, @Headers() headers: any, @Query() query: any) {
    await this._doProxy(this.EVENT_SERVICE_URL, req, res, body, headers, query);
  }

  // 명시적으로 매칭되지 않는 다른 모든 경로에 대한 처리 (404 Not Found)
  @All('*')
  handleNotFound(@Req() request: Request, @Res() response: Response) {
    this.logger.warn(`No explicit proxy route matched for ${request.method} ${request.originalUrl}. Returning 404.`);
    response.status(HttpStatus.NOT_FOUND).send({ message: 'Service endpoint not found through gateway.' });
  }
}
