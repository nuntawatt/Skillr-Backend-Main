import { NestFactory } from '@nestjs/core';
import { AuthAppModule } from './auth-app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('AuthBootstrap');
  const app = await NestFactory.create(AuthAppModule, {
    logger: ['log', 'error', 'warn'],
  });

  // allowedHeaders: ['http://localhost:3000', 'https://skllracademy.com'],
  // origin: [process.env.FRONTEND_URL, 'http://localhost:3000', 'https://skllracademy.com'],
  app.enableCors({
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
    .setTitle('Skillr Auth Service API')
    .setDescription('API documentation for the Auth Service')
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .addServer('https://api.skllracademy.com/api')
    .addServer('/api')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.setGlobalPrefix('api');

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);

  logger.log(`Auth service listening on http://localhost:${port}/api`);
  logger.log(`Swagger docs available at http://localhost:${port}/docs`);
}

void bootstrap();