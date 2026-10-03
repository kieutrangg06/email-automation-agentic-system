import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsNumber,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class ApproveDraftDto {
  @IsEmail()
  reviewed_by: string;
}

export class ModifyDraftDto extends ApproveDraftDto {
  @IsString()
  @MinLength(1)
  @Matches(/\S/)
  subject: string;

  @IsString()
  @MinLength(1)
  @Matches(/\S/)
  body: string;
}

export class NotifyDraftDto {
  @IsInt()
  @Min(1)
  draft_id: number;

  @IsOptional()
  @IsString()
  ticket_code?: string;

  @IsEmail()
  recipient_email: string;

  @IsInt()
  @Min(0)
  @Max(100)
  confidence: number;

  @IsUrl({ require_tld: false })
  resume_url: string;

  @IsString()
  @MinLength(1)
  execution_id: string;
}

export class DailySummaryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  summary_date: string;

  @IsInt()
  @Min(0)
  total_received: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  total_p1?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  pending_tickets?: number;

  @IsOptional()
  @IsArray()
  key_insights?: unknown[];

  @IsOptional()
  @IsArray()
  negative_issues?: unknown[];

  @IsOptional()
  @IsBoolean()
  incident_spike?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  incident_count?: number;

  @IsOptional()
  baseline_count?: number;

  @IsOptional()
  increase_percent?: number;

  @IsOptional()
  @IsString()
  risk_summary?: string;

  @IsOptional()
  @IsArray()
  recommendations?: unknown[];

  @IsOptional()
  @IsInt()
  @Min(0)
  recipient_count?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sent_count?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  failed_count?: number;
}

export class DraftStatusSyncDto {
  @IsInt()
  @Min(1)
  draft_id: number;

  @IsString()
  status: string;
}