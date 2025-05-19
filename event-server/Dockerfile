# ---- Builder Stage ----
# Node.js 18을 빌더 이미지로 사용
FROM node:18 AS builder

# 작업 디렉토리 생성
WORKDIR /app

# package.json 및 package-lock.json 복사
COPY package*.json ./

# 모든 의존성 설치 (개발 의존성 포함)
# npm ci는 package-lock.json을 사용하여 더 빠르고 안정적인 빌드를 제공합니다.
RUN npm ci

# 나머지 소스 코드 복사
COPY . .

# 애플리케이션 빌드 (NestJS는 기본적으로 TypeScript 사용)
RUN npm run build

# ---- Production Stage ----
# 경량화된 Alpine Linux 기반의 Node.js 18 이미지를 최종 이미지로 사용
FROM node:18-alpine AS production

WORKDIR /app

# 보안을 위해 non-root 사용자 생성 및 사용
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# 프로덕션 의존성 설치를 위해 package 파일 복사
COPY package*.json ./

# 프로덕션 의존성만 설치 (devDependencies 제외)
RUN npm ci --omit=dev --ignore-scripts

# 빌더 스테이지에서 빌드된 애플리케이션 파일 복사
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist

# 애플리케이션 파일 및 디렉토리 소유권을 non-root 사용자로 변경
RUN chown -R appuser:appgroup /app

# non-root 사용자로 전환
USER appuser

# NestJS 기본 포트 노출
EXPOSE 3000

# 앱 실행
CMD [ "node", "dist/main" ]

# 선택 사항: 헬스 체크 (애플리케이션에 /health 엔드포인트가 있어야 함)
# HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
#   CMD wget -q --spider http://localhost:3000/health || exit 1