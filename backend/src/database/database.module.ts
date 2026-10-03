import { Global, Module } from '@nestjs/common';
import 'dotenv/config';
import { Pool } from 'pg';

export const POSTGRES_POOL = 'POSTGRES_POOL';

@Global()
@Module({
  providers: [
    {
      provide: POSTGRES_POOL,
      useFactory: () => {
        const password = process.env.PGPASSWORD;
        if (!password) {
          throw new Error('PGPASSWORD must be set to a non-empty string');
        }
        return new Pool({
          host: process.env.PGHOST ?? '127.0.0.1',
          port: Number(process.env.PGPORT ?? 5432),
          database: process.env.PGDATABASE ?? 'email_automation_db',
          user: process.env.PGUSER ?? 'admin',
          password,
          max: Number(process.env.PGPOOL_MAX ?? 10),
        });
      },
    },
  ],
  exports: [POSTGRES_POOL],
})
export class DatabaseModule {}