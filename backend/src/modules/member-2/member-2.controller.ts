import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApproveDraftDto,
  DailySummaryDto,
  DraftStatusSyncDto,
  ModifyDraftDto,
  NotifyDraftDto,
} from './member-2.dto';
import { Member2Service } from './member-2.service';

@Controller('api/v1')
export class Member2Controller {
  constructor(private readonly service: Member2Service) {}

  @Get('knowledge')
  getKnowledge(@Query('q') query?: string) {
    return this.service.getKnowledge(query);
  }

  @Get('email-drafts')
  getDrafts(@Query('status') status?: string) {
    return this.service.getDrafts(status);
  }

  @Get('approvals/pending')
  getPendingApprovals() {
    return this.service.getDrafts('PENDING_APPROVAL');
  }

  @Get('email-drafts/:id')
  getDraft(@Param('id', ParseIntPipe) id: number) {
    return this.service.getDraft(id);
  }

  @Post('notifications/email-draft')
  notifyDraft(@Body() body: NotifyDraftDto) {
    return this.service.notifyDraft(body);
  }

  @Post('email-drafts/:id/approve')
  approveDraft(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ApproveDraftDto,
  ) {
    return this.service.submitApproval(id, 'APPROVE', body);
  }

  @Post('email-drafts/:id/modify')
  modifyDraft(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ModifyDraftDto,
  ) {
    return this.service.submitApproval(id, 'MODIFY', body);
  }

  @Post('email-drafts/:id/reject')
  rejectDraft(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ApproveDraftDto,
  ) {
    return this.service.rejectDraft(id, body.reviewed_by);
  }

  @Post('approvals/:id/action')
  approvalAction(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ModifyDraftDto,
  ) {
    return this.service.submitApproval(id, 'MODIFY', body);
  }

  @Post('dashboard/email-draft-status')
  syncDraftStatus(@Body() body: DraftStatusSyncDto) {
    return this.service.syncDraftStatus(body);
  }

  @Get('dashboard/daily-summary/history')
  getSummaryHistory(@Query('limit') limit?: string) {
    return this.service.getSummaryHistory(limit);
  }

  @Get('dashboard/daily-summary')
  async getDailySummary(@Query('date') date?: string) {
    const data = date
      ? await this.service.getDailySummary(date)
      : await this.service.getLatestDailySummary();
    return { data };
  }

  @Get('dashboard/daily-summary/:date')
  async getDailySummaryByDate(@Param('date') date: string) {
    return { data: await this.service.getDailySummary(date) };
  }

  @Post('dashboard/daily-summary')
  saveDailySummary(@Body() body: DailySummaryDto) {
    return this.service.saveDailySummary(body);
  }
}