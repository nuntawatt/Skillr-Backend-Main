import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const databaseUrl = configService.get<string>('DATABASE_URL');

  return {
    type: 'postgres',
    url: databaseUrl,
    autoLoadEntities: false,
    synchronize: configService.get<string>('NODE_ENV') !== 'production',
    logging: false, // Set to true if you need SQL query log
  };
};
