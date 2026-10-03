import { Module } from '@nestjs/common';
import { Member2Controller } from './member-2.controller';
import { Member2Service } from './member-2.service';

@Module({
  controllers: [Member2Controller],
  providers: [Member2Service],
})
export class Member2Module {}