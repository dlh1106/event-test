# Node.js 18 기반 이미지 사용
FROM node:18

# 작업 디렉토리 생성
WORKDIR /app

# package*.json 복사
COPY package*.json ./

# NestJS 프로젝트 의존성 설치
RUN npm install

# 나머지 소스 복사
COPY . .

# 애플리케이션 빌드 (NestJS는 기본적으로 TypeScript 사용)
RUN npm run build

# NestJS 기본 포트
EXPOSE 3002

# 앱 실행 (필요에 따라 start:dev -> start로 변경 가능)
CMD ["npm", "run", "start:dev"]