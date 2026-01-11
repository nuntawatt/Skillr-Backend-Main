import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { LearningAppModule } from './learning-app.module';

async function bootstrap() {
  const logger = new Logger('LearningBootstrap');

  const app = await NestFactory.create(LearningAppModule, {
    logger: ['log', 'error', 'warn'],
  });

  const config = new DocumentBuilder()
    .setTitle('Skillr Learning Service API')
    .setDescription('API documentation for Quiz and Learning Progress')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({ origin: true, credentials: true });

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  app.setGlobalPrefix('api');

  const port = Number(process.env.PORT ?? 3003);
  await app.listen(port);

  logger.log(`Learning service listening on http://localhost:${port}/api`);
  logger.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}

void bootstrap();
