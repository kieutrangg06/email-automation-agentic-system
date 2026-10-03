import { Controller, Post, Get, Patch, Body, Query, Param, ParseIntPipe } from '@nestjs/common';
import { TicketsService } from './tickets.service';

@Controller('api/v1/triage')
export class TicketsController {
  constructor(private readonly service: TicketsService) {}

  @Get('departments')
  async getDepartments() {
    return this.service.getDepartments();
  }

  @Get('logs')
  async getLogs(
    @Query('category') category?: string,
    @Query('priority') priority?: string,
  ) {
    return this.service.getRecentLogs(category, priority);
  }

  @Patch('logs/:id/status')
  async updateLogStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    return this.service.updateTriageStatus(id, status);
  }

  @Get('stats')
  async getStats() {
    return this.service.getStats();
  }

  @Post('tickets')
  async createTicket(@Body() body: any) {
    return this.service.createTicket(body);
  }

  @Get('tickets')
  async getTickets(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
  ) {
    return this.service.getAllTickets(status, priority);
  }

  @Patch('tickets/:code/resolve')
  async resolve(@Param('code') code: string) {
    return this.service.resolveTicket(code);
  }

  @Post('in-app-alert')
  async inAppAlert(@Body() body: any) {
    return { status: 'acknowledged', received: body };
  }
}