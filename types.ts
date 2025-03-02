export type EmailType = {
  subject: string;
  from: string;
  to: string;
  message_id: string | null | undefined;
  date: string;
  strippedBody: string;
};
