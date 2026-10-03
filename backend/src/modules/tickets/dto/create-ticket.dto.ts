export class CreateTicketDto {
  ticket_code: string;
  sender_email: string;
  title: string;
  description: string;
  summary?: string;
  category: string;
  priority: string;
  assigned_to?: string;
  agent_email?: string;
  first_response_sla?: string;
}
