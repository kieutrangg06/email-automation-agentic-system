export class TriageWebhookDto {
  sender_email: string;
  sender_name?: string;
  subject: string;
  body_snippet?: string;
  category: string;
  priority: string;
  sentiment: string;
  urgency_reason?: string;
  sla_deadline?: string;
}
