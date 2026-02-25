import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { RewardAppModule } from './reward.module';

async function bootstrap() {
  const logger = new Logger('RewardBootstrap');
  const app = await NestFactory.create(RewardAppModule, {
    logger: ['log', 'error', 'warn'],
  });

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
    .setTitle('Skillr Reward Service API')
    .setDescription('API documentation for the Reward Service')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addServer('https://api.skllracademy.com/s3/api')
    .addServer('http://localhost:3003/api')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  app.setGlobalPrefix('api');
 
  const port = Number(process.env.PORT ?? 3003);
  await app.listen(port);

  logger.log(`Reward service listening on http://localhost:${port}/api`);
  logger.log(`Swagger docs available at http://localhost:${port}/docs`);
}
void bootstrap();
