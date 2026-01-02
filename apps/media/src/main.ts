import { NestFactory, Reflector } from '@nestjs/core';
<<<<<<< Updated upstream
import {
  ClassSerializerInterceptor,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
=======
import { ClassSerializerInterceptor, Logger, ValidationPipe } from '@nestjs/common';
>>>>>>> Stashed changes
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('MediaBootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

<<<<<<< Updated upstream
  // Allow other devices in the same LAN to call the API from a frontend origin.
  // For production, restrict origins explicitly.
  app.enableCors({ origin: true, credentials: true });

=======
  
>>>>>>> Stashed changes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
<<<<<<< Updated upstream

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.setGlobalPrefix('api');

  const port = Number(process.env.PORT ?? 3004);
  // const portInfo = isNaN(port) ? process. : port;
=======
  
  const config = new DocumentBuilder()
    .setTitle('Skllr Media Service API')
    .setDescription('API documentation for the Media Service')
    .setVersion('1.0.0')
    .addServer('http://localhost:3004', 'Local server')
    .addBearerAuth() 
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  
  app.setGlobalPrefix('api');
  
  const port = Number(process.env.PORT ?? 3004);
>>>>>>> Stashed changes
  await app.listen(port);

  logger.log(`Media service listening on http://localhost:${port}/api`);
  logger.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}

void bootstrap();
