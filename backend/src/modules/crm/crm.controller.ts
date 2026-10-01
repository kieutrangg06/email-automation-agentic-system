import { Body, Controller, Get, Post } from '@nestjs/common';
import { CrmService } from './crm.service';
import { CreateLeadDto, CreateInvoiceDto } from './dto/create-lead.dto';

@Controller('api/v1/crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get('leads')
  getLeads() {
    return this.crmService.getCustomers();
  }

  @Post('leads')
  createLead(@Body() dto: CreateLeadDto) {
    return this.crmService.handleLeadWebhook(dto);
  }

  @Get('invoices')
  getInvoices() {
    return this.crmService.getInvoices();
  }

  @Post('invoices')
  createInvoice(@Body() dto: CreateInvoiceDto) {
    return this.crmService.handleInvoiceWebhook(dto);
  }
}