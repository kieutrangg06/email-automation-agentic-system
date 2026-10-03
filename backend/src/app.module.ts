import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { Member2Module } from './modules/member-2/member-2.module';
import { TicketsModule } from './modules/tickets/tickets.module';

export const { ObserveModule, ObserveInstrument } = createObserveModule();
const observeImports =
  process.env.OBSERVE_APP_KEY && process.env.OBSERVE_APP_SECRET
    ? [
        ObserveModule.forRoot({
          appKey: process.env.OBSERVE_APP_KEY,
          appSecret: process.env.OBSERVE_APP_SECRET,
          serviceId: 'backend',
        }),
      ]
    : [];

@Module({
  imports: [
    ...observeImports,
    DatabaseModule,
    Member2Module,
    TicketsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
