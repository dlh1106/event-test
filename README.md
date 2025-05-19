# 프로젝트 제목 : 이벤트/보상 관리 시스템

## 프로젝트 개요

사용자에게 이벤트를 제공하고, 이벤트 참여에 따른 보상 요청 및 관리를 처리하기 위한 백엔드 시스템

## 아키텍처

- **Gateway Server :** 클라이언트 요청의 단일 진입점. 각 백엔드 서비스로 요청을 라우팅하는 API Gateway 역할을 합니다. 클라이언트와 백엔드 서비스 간의 중개자 역할을 수행.
- **Auth Server :** 사용자 회원가입, 로그인, 인증(JWT 발급/검증) 및 사용자 정보 관리를 담당.
- **Event Server :** 이벤트 생성/관리, 보상 생성/관리, 사용자의 보상 요청 처리 및 보상 요청 내역 관리 등 핵심 비즈니스 로직을 담당.
- **MongoDB:** 각 서비스의 데이터를 저장하는 NoSQL 데이터베이스. Docker Compose를 통해 독립된 컨테이너로 실행.

각 서비스는 Docker 컨테이너로 격리되어 있으며, Docker 네트워크를 통해 서로 통신합니다. Docker Compose 파일 하나로 전체 시스템을 쉽게 배포하고 관리할 수 있습니다.

## 기술 스택

- 백엔드: Node.js, NestJS, TypeScript
- 데이터베이스: MongoDB
- 배포 도구: Docker
- 개발 도구: VS Code, GitHub, Gemini, copilot

## 과제 실행 방법 (Docker Compose 사용)

- docker compose up -d --build # 백그라운드로 실행하며 빌드 포함
  또는 
  docker compose up --build

## 서비스 접근

- API Gateway (클라이언트 요청): `(http://localhost:3000/api)`
- auth 서버 api 문서 접근 http://localhost:3001/api-docs (일반적으론 gate 서버로 접근 가능하나 접속가능)
- event 서버 api 문서 접근 http://localhost:3002/api-docs (일반적으론 gate 서버로 접근 가능하나 접속가능)
