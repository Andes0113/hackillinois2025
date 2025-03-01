import { signIn } from '@/lib/auth';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex justify-center items-start md:items-center p-8">
      <form
        action={async () => {
          'use server';
          await signIn('google', {
            redirectTo: '/'
          });
        }}
        className="w-full"
      >
        <button className="w-full">Sign in with Google</button>
      </form>
    </div>
  );
}
