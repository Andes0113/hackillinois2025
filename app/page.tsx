// page.tsx
import { auth } from '@/lib/auth';
import fetchEmails, { fetchAndStoreEmails } from '@/lib/gmail';
import LoginPage from './login/page';
import FlowCanvas from './components/FlowCanvas';

export default async function HomePage() {
  const session = await auth();

  if (!session || !session.accessToken) {
    return <LoginPage />;
  }

  const emails = await fetchEmails(session.accessToken, 30);
  // console.log(emails);
  await fetchAndStoreEmails(session.user!.email!, session.accessToken, 30);

  return (
    <div className="p-6">
      {/* <h1 className="text-xl font-bold">Your Emails</h1>
      <ul>
        {emails.map((email, index) => (
          <li key={index} className="border-b py-2">
            <strong>{email.subject}</strong> - {email.strippedBody}
          </li>
        ))}
      </ul> */}
      <FlowCanvas />
    </div>
  );
}
