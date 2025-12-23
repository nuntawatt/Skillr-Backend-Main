import { NestFactory, Reflector } from '@nestjs/core';
import {
  ClassSerializerInterceptor,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('MediaBootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  // Allow other devices in the same LAN to call the API from a frontend origin.
  // For production, restrict origins explicitly.
  app.enableCors({ origin: true, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.setGlobalPrefix('api');

  const port = Number(process.env.PORT ?? 3002);
  await app.listen(port);

  logger.log(`Media service listening on http://localhost:${port}/api`);
}

void bootstrap();
