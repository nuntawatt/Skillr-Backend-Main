import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger, ClassSerializerInterceptor } from '@nestjs/common';
import * as express from 'express';
import cookieParser from 'cookie-parser';
import { AppModule } from './course.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('CourseBootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  app.enableCors({
    // origin: [process.env.FRONTEND_URL, 'http://localhost:3000', 'https://skllracademy.com'],
    // credentials: true,
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: '*',
    credentials: false,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );


  const config = new DocumentBuilder()
    .setTitle('Skillr Course Service API')
    .setDescription('API documentation for the Course Service')
    .setVersion('1.0.0')
    .addServer('https://skllracademy.com/api')
    .addServer('157.85.98.100:3002/api')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs/course', app, document);


  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.use(cookieParser());

  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.setGlobalPrefix('api');

  const port = Number(process.env.PORT ?? 3002);
  await app.listen(port);


  logger.log(`Course service listening on http://localhost:${port}/api`);
  logger.log(`Swagger docs available at http://localhost:${port}/docs/course`);
}
void bootstrap();
