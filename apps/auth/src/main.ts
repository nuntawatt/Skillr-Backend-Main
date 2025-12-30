import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AuthAppModule } from './auth-app.module';

async function bootstrap() {
  const logger = new Logger('AuthBootstrap');
  const app = await NestFactory.create(AuthAppModule, {
    logger: ['log', 'error', 'warn'],
  });

  // Enable CORS for all origins (adjust as needed for production)
  app.enableCors({ origin: true, credentials: true });
    
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use(cookieParser());

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);

  logger.log(`Auth service listening on http://localhost:${port}`);
}

void bootstrap();
