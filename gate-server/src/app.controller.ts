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
@UseGuards(JwtAuthGuard, RolesGuard) // 컨트롤러 레벨에서 가드 적용
export class AppController {
  // 백엔드 서비스 주소 (예시, 실제 환경에서는 환경 변수 사용 권장)
  // Docker Compose 서비스 이름과 내부 포트를 사용하도록 수정
  private readonly AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-server:3000';
  private readonly EVENT_SERVICE_URL = process.env.EVENT_SERVICE_URL || 'http://event-server:3000';

  private readonly logger = new Logger(AppController.name); // Logger 인스턴스 생성

  constructor(private readonly httpService: HttpService) {}

  // 모든 경로와 모든 HTTP 메소드를 처리
  @All('*')
  @ApiOperation({
    summary: 'Proxy to Backend Services',
    description: `
      인증 및 인가 후 /auth 또는 /event로 시작하는 모든 수신 요청을 각 백엔드 서비스로 프록시합니다.
      - /auth/* 로의 요청은 인증 서비스(${process.env.AUTH_SERVICE_URL || 'http://auth-server:3000'})로 전달됩니다.
      - /event/* 로의 요청은 이벤트 서비스(${process.env.EVENT_SERVICE_URL || 'http://event-server:3000'})로 전달됩니다.
      원본 요청의 메소드, 헤더, 본문 및 쿼리 파라미터는 그대로 유지됩니다.
      참고: 특정 DTO 및 상세 응답 스키마는 각 백엔드 서비스의 Swagger 문서에 정의되어 있습니다.
    `,
  })
  @ApiHeader({ name: 'Authorization', description: 'Bearer token for authentication (passed through)', required: false })
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded', 'multipart/form-data', '*/*') // 다양한 Content-Type 처리 명시
  @ApiProduces('application/json', '*/*') // 다양한 응답 타입 명시
  async proxyRequest(
    @Req() request: Request,
    @Res() response: Response,
    @Body() body: any, // 요청 본문
    @Headers() headers: any, // 요청 헤더
    @Query() query: any, // 쿼리 파라미터
  ) {
    // 이 시점에서 JwtAuthGuard와 RolesGuard가 성공적으로 통과했습니다.
    // request.user 객체에는 JwtAuthGuard에 의해 사용자 정보가 채워져 있습니다.
    this.logger.debug(`Proxying request for user: ${request.user?.['userId']} (Role: ${request.user?.['role']}) to ${request.originalUrl}`);

    const path = request.originalUrl; // 원본 요청 경로 (쿼리 포함)
    const method = request.method.toLowerCase(); // 요청 메소드 (소문자로)

    let targetUrl = '';
    if (path.startsWith('/auth')) {
      targetUrl = `${this.AUTH_SERVICE_URL}${path}`;
    } else if (path.startsWith('/event')) {
      targetUrl = `${this.EVENT_SERVICE_URL}${path}`;
    } else {
      // 매칭되는 서비스가 없으면 404 응답
      return response.status(HttpStatus.NOT_FOUND).send('Service not found');
    }

    // 백엔드로 요청 포워딩
    // 원본 요청의 헤더, 본문, 쿼리 파라미터 등을 그대로 전달
    // Authorization 헤더 등 필요한 헤더를 복사
    const headersToForward = { ...headers };
    // 호스트 헤더는 백엔드 서버의 호스트로 변경될 수 있도록 제거하거나 수정해야 할 수 있습니다.
    delete headersToForward.host;

    try {
      // HttpService를 사용하여 백엔드로 요청 전송
      const backendResponse = await firstValueFrom(
        this.httpService.request({
          method: method as any, // 메소드 타입 캐스팅
          url: targetUrl,
          headers: headersToForward,
          data: body, // POST, PUT 등의 본문 데이터
          params: query, // 쿼리 파라미터
        }).pipe(
          // 백엔드 응답을 그대로 반환
          map(res => res),
          // 에러 발생 시 상태 코드와 메시지 전달
          catchError(err => {
            const status = err.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
            const data = err.response?.data || 'Internal Server Error';
            response.status(status).send(data);
            throw err; // 에러를 다시 던져서 NestJS 로깅 시스템이 처리하도록 함
          }),
        )
      );

      // 백엔드로부터 받은 상태 코드와 데이터를 클라이언트에 응답
      response.status(backendResponse.status).send(backendResponse.data);

    } catch (error) {
      // catchError에서 이미 응답을 보냈으므로 여기서는 추가 작업이 필요 없을 수 있습니다.
      // 로깅 등 필요한 처리를 추가할 수 있습니다.
      console.error('Proxy request failed:', error.message);
      // catchError에서 응답을 보내지 않았다면 여기서 500 에러 응답을 보낼 수 있습니다.
      // if (!response.headersSent) {
      //   response.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Proxy Error');
      // }
    }
  }
}
