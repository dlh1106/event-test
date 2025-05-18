import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Event Server API')
    .setDescription('The Event Server API description')
    .setVersion('1.0')
    .addTag('event-server')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document); // '/api-docs' 경로로 Swagger UI가 제공됩니다.

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
