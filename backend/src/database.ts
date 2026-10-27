import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';
import { ALL_ENTITIES } from './entities';

type Env = Record<string, string | undefined>;

/** Shared by the Nest app and the seed script. */
export function databaseOptions(env: Env): DataSourceOptions & TypeOrmModuleOptions {
  return {
    type: 'postgres',
    url: env.DATABASE_URL,
    host: env.DATABASE_URL ? undefined : (env.DB_HOST ?? 'localhost'),
    port: env.DATABASE_URL ? undefined : Number(env.DB_PORT ?? 5432),
    username: env.DATABASE_URL ? undefined : (env.DB_USER ?? 'postgres'),
    password: env.DATABASE_URL ? undefined : (env.DB_PASSWORD ?? 'postgres'),
    database: env.DATABASE_URL ? undefined : (env.DB_NAME ?? 'vivo_diwali'),
    entities: ALL_ENTITIES,
    // Creates/updates tables from the entities. Fine for a short campaign site;
    // set DB_SYNC=false once the schema is final if you prefer.
    synchronize: (env.DB_SYNC ?? 'true') === 'true',
    ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };
}
