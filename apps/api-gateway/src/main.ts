import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';

// Load environment variables from the local .env file inside apps/api-gateway
dotenv.config({ path: `${process.cwd()}/apps/api-gateway/.env` });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port);
  Logger.log(`API Gateway listening on port ${port}`);
}

bootstrap();
