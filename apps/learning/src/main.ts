import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, Logger, ValidationPipe, } from '@nestjs/common';
import { AppModule } from './learning.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('LearningBootstrap');
  const app = await NestFactory.create(AppModule, {
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
    .setTitle('Skillr Learning Service API')
    .setDescription('API documentation for the Learning Service')
    .setVersion('1.0.0')
    .addServer('https://skllracademy.com/api')
    .addServer('157.85.98.100:3005/api')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs/learning', app, document);


  app.enableCors({ origin: true, credentials: true });

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.setGlobalPrefix('api');

  const port = Number(process.env.PORT ?? 3005);
  await app.listen(port);

  logger.log(`Learning service listening on http://localhost:${port}/api`);
  logger.log(`Swagger docs available at http://localhost:${port}/docs/learning`);
}

void bootstrap();
