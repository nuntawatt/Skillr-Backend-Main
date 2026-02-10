import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger, ClassSerializerInterceptor } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { StockModule } from './stock.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { StockDataSource } from '../data-source';

async function bootstrap() {
  const logger = new Logger('StockBootstrap');
  const app = await NestFactory.create(StockModule, {
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Skillr Stock Service API')
    .setDescription('API documentation for the Stock Service')
    .setVersion('1.0.0')
    .addServer('/api')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.use(cookieParser());

  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.setGlobalPrefix('api');

  const port = Number(process.env.PORT ?? 3003);

  try {
    await StockDataSource.initialize();
    logger.log('StockDataSource initialized');
  } catch (err) {
    logger.error('StockDataSource initialization error', String(err));
    process.exit(1);
  }

  await app.listen(port);

  logger.log(`Stock service listening on http://localhost:${port}/api`);
  logger.log(`Swagger docs available at http://localhost:${port}/docs`);
}

void bootstrap();
