import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('API Gateway')
    .setDescription('The API Gateway for Auth and Event services. All requests to /auth/* and /event/* are proxied.')
    .setVersion('1.0')
    .addTag('Gateway')
    .addBearerAuth() // JWT 인증을 사용하는 경우 Bearer Auth 추가
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // '/api' 경로에서 Swagger UI를 제공

  await app.listen(3000);
}
bootstrap();
