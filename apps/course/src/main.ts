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

  // Enable CORS for all origins (adjust as needed for production)
  // app.enableCors({ origin: true, credentials: true });
  app.enableCors({
    origin: '*', // Allows all origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS', // Allows all common methods
    allowedHeaders: '*', // Allows all headers
    credentials: true, // If you need to support credentials
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
    .addServer('/api')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs/course', app, document);

  // app.enableCors({ origin: true, credentials: true });
  const allowedOrigins = ['https://skllracademy.com', 'http://157.85.98.100:3001', 'http://localhost:3000'].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow non-browser tools like Postman
      return allowedOrigins.includes(origin)
        ? callback(null, true)
        : callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  });
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
