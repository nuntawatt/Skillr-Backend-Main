import { NestFactory, Reflector } from '@nestjs/core';
import {
  ClassSerializerInterceptor,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { AppModule } from './app.module';

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

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.setGlobalPrefix('api');

  const port = Number(process.env.PORT ?? 3003);
  await app.listen(port);

  logger.log(`Learning service listening on http://localhost:${port}/api`);
}

void bootstrap();
