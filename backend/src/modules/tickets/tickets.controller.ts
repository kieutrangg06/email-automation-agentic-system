import { Controller, Post, Get, Patch, Body, Query, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TriageWebhookDto } from './dto/triage-webhook.dto';

@Controller('api/v1/triage')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get('departments')
  async getDepartments() {
    return this.ticketsService.getDepartments();
  }

  @Post('webhook-callback')
  @HttpCode(HttpStatus.OK)
  async handleTriageCallback(@Body() dto: TriageWebhookDto) {
    return this.ticketsService.recordTriageEvent(dto);
  }

  @Get('logs')
  async getTriageLogs(
    @Query('category') category?: string,
    @Query('priority') priority?: string,
  ) {
    return this.ticketsService.getRecentLogs(category, priority);
  }

  @Get('stats')
  async getStats() {
    return this.ticketsService.getStats();
  }

  @Patch('logs/:id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.ticketsService.updateStatus(Number(id), status);
  }
}
