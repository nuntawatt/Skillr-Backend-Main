import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { AuthAppModule } from './auth-app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('AuthBootstrap');
  const app = await NestFactory.create(AuthAppModule, {
    logger: ['log', 'error', 'warn'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const config = new DocumentBuilder()  
    .setTitle('Skillr Auth Service API')
    .setDescription('API documentation for the Auth Service')
    .setVersion('1.0.0')
    .addServer('/api')
    .addBearerAuth() 
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs/auth', app, document);

  const allowedOrigins = [process.env.FRONTEND_URL];
  if (process.env.NODE_ENV === 'development') allowedOrigins.push('http://localhost:3000');

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow non-browser tools like Postman
      return allowedOrigins.includes(origin)
        ? callback(null, true)
        : callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  });

  app.use(cookieParser());
  
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.setGlobalPrefix('api');  

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);

  logger.log(`Auth service listening on http://localhost:${port}/api`);
  logger.log(`Swagger docs available at http://localhost:${port}/docs/auth`);
}

void bootstrap();