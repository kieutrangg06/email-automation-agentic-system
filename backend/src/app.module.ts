import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TicketsModule } from './modules/tickets/tickets.module';
import { CrmModule } from './modules/crm/crm.module';
import { AccountingController } from './modules/accounting/accounting.controller';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'backend',
    }),
    TicketsModule,
    CrmModule,
  ],
  controllers: [AppController, AccountingController],
  providers: [AppService],
})
export class AppModule {}