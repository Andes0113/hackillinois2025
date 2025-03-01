import { auth } from '@/lib/auth';
import LoginPage from './login/page';

export default async function HomePage() {
  const session = await auth();
  console.log(session);
  return (
    <div>
      TypeScript
      <LoginPage />
    </div>
  );
}
