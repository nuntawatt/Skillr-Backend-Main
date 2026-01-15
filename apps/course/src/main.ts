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

  // Increase global body parser limits to allow large multipart/form-data uploads
  // (some clients or proxies may add small overhead; keep margin above MAX_PDF_SIZE_BYTES)
  // app.use(express.json({ limit: '60mb' }));
  // app.use(express.urlencoded({ limit: '60mb', extended: true }));
  
  const config = new DocumentBuilder()
    .setTitle('Skillr Course Service API')
    .setDescription('API documentation for the Course Service')
    .setVersion('1.0.0')
    .addServer('http://localhost:3002', 'Local server')
    .addBearerAuth() 
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);


  app.enableCors({ origin: true, credentials: true });
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.use(cookieParser());

  app.setGlobalPrefix('api');


  const port = Number(process.env.PORT ?? 3002);
  await app.listen(port, '0.0.0.0');

  logger.log(`Application is running on http://localhost:${port}/api`);
  logger.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}
void bootstrap();
