import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const databaseUrl = configService.get<string>('DATABASE_URL');

  return {
    type: 'postgres',
    url: databaseUrl,
    autoLoadEntities: true, // true or false
    synchronize: false, // Disabling synchronize since we are using migrations
    logging: false, // Set to true if you need SQL query log
  };
};
