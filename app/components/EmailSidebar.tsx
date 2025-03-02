'use client';
import { useEmailContext } from 'app/contexts/EmailContext';

type EmailType = {
  subject: string;
  from: string;
  to: string;
  message_id: string | null | undefined;
  date: string;
  strippedBody: string;
};

const EmailBlock = ({ email }: { email: EmailType }) => {
  return (
    <div className="min-h-28 max-h-28 border-b border-gray-300 px-2 py-1 max-w-full overflow-hidden">
      <p className="font-bold text-nowrap overflow-ellipsis">{email.subject}</p>
      <p className="overflow-hidden">{email.strippedBody}</p>
    </div>
  );
};

export default function EmailSidebar() {
  const { emails, emailsLoading } = useEmailContext();

  if (emailsLoading) {
    return <div></div>;
  }
  // console.log(emails);

  return (
    <div className="border-r border-gray-400 max-w-96 max-h-screen overflow-auto">
      {emails.map((email) => (
        <EmailBlock email={email} key={email.message_id} />
      ))}
    </div>
  );
}
