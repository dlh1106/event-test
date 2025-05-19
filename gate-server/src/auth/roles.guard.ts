// /home/dlh1106/nodetest/gate-server/src/auth/roles.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Role } from './role.enum';

// Helper to check if the path starts with a given prefix.
// You might want to use more sophisticated matching (e.g., regex) for complex scenarios.
const matchPathPrefix = (prefix: string, path: string): boolean => {
  // Simple startsWith check. Consider query parameters in path.
  // A more robust check might involve parsing the URL.
  const url = new URL(path, 'http://dummy'); // Use a dummy base URL to parse
  return url.pathname.startsWith(prefix);
};

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Assumes request.user is populated by an AuthGuard (like JwtAuthGuard)

    if (!user || !user.role) {
      this.logger.warn('User or user.role not found in request. Access denied.');
      // This indicates an authentication issue or misconfiguration.
      // JwtAuthGuard should handle unauthenticated requests first.
      // This might happen if JwtAuthGuard is skipped or fails silently.
      throw new ForbiddenException('Authentication required or role missing.');
    }

    const userRole: Role = user.role as Role; // Cast to Role enum
    const path = request.originalUrl; // e.g., /event/rewards/request?userId=1
    const method = request.method.toUpperCase();
    const pathname = new URL(path, 'http://dummy').pathname; // 쿼리 파라미터를 제외한 순수 경로

    this.logger.debug(`Checking access for User Role: ${userRole}, Pathname: ${pathname}, Method: ${method}`);

    // ADMIN can access everything
    if (userRole === Role.ADMIN) {
      this.logger.debug(`ADMIN role granted access to ${method} ${pathname}`);
      return true;
    }

    // Define allowed actions based on role
    switch (userRole) {
      case Role.USER:
        // USER: 보상/쿠폰 요청/수령만 가능
        // 예시: POST /event/rewards/request, POST /event/coupons/claim
        // 실제 event-server의 경로로 수정해주세요.
        if (
          method === 'POST' &&
          (matchPathPrefix('/event/rewards/request', pathname) || // 예시 경로 1
           matchPathPrefix('/event/coupons/claim', pathname))      // 예시 경로 2
        ) {
          this.logger.debug(`USER role granted access to ${method} ${pathname}`);
          return true;
        }
        break;
      case Role.OPERATOR:
        // OPERATOR: 이벤트 등록/수정/삭제, 보상/쿠폰 정의 등록/수정/삭제 가능
        // 예시:
        // 이벤트 관리: POST, PUT, DELETE /event/events/*
        // 보상/쿠폰 정의 관리: POST, PUT, DELETE /event/rewards/definitions/* 또는 /event/coupons/definitions/*
        // 실제 event-server의 경로로 수정해주세요.
        if (
          (matchPathPrefix('/event/events', pathname) && ['POST', 'PUT', 'DELETE'].includes(method)) || // 이벤트 관련
          (matchPathPrefix('/event/rewards/definitions', pathname) && ['POST', 'PUT', 'DELETE'].includes(method)) || // 보상 정의 관련
          (matchPathPrefix('/event/coupons/definitions', pathname) && ['POST', 'PUT', 'DELETE'].includes(method))    // 쿠폰 정의 관련
        ) {
           this.logger.debug(`OPERATOR role granted access to ${method} ${pathname}`);
           return true;
        }
        break;
      case Role.AUDITOR:
        // AUDITOR: 보상/쿠폰 이력 조회만 가능
        // 예시: GET /event/rewards/history, GET /event/coupons/history, GET /event/audit/rewards
        // 실제 event-server의 경로로 수정해주세요.
        if (
          method === 'GET' &&
          (matchPathPrefix('/event/rewards/history', pathname) || // 예시 경로 1
           matchPathPrefix('/event/coupons/history', pathname) || // 예시 경로 2
           matchPathPrefix('/event/audit/rewards', pathname))     // 예시 경로 3
        ) {
           this.logger.debug(`AUDITOR role granted access to ${method} ${pathname}`);
           return true;
        }
        break;
    }

    // If none of the allowed conditions were met for the specific role
    this.logger.warn(`Role ${userRole} denied access to ${method} ${pathname}`);
    throw new ForbiddenException(`Your role (${userRole}) does not have permission for this action.`);
  }
}