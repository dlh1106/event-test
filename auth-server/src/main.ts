// /home/dlh1106/nodetest/auth-server/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true }, // 쿼리 파라미터 등 자동 타입 변환
  }));

  // Swagger 설정 (auth-server용)
  const config = new DocumentBuilder()
    .setTitle('Auth Server API')
    .setDescription('The Auth Server API for user authentication and management')
    .setVersion('1.0')
    .addTag('auth')
    .addBearerAuth() // JWT 인증을 사용하는 API를 위해 추가
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);


  await app.listen(process.env.AUTH_PORT || 3000); // auth-server 포트
  console.log(`Auth server is running on: ${await app.getUrl()}/api-docs`);
}
bootstrap();
