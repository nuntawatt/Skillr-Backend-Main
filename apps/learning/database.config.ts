import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getLearningDatabaseConfig = (
  config: ConfigService,
): TypeOrmModuleOptions => ({
  name: 'learning',
  type: 'postgres',
  url: config.get('DATABASE_LEARNING_URL'),
  autoLoadEntities: true,
  synchronize: false,
});

export const getCourseDatabaseConfig = (
  config: ConfigService,
): TypeOrmModuleOptions => ({
  name: 'course',
  type: 'postgres',
  url: config.get('DATABASE_COURSE_URL'),
  autoLoadEntities: true,
  synchronize: false,
});
