// login/page.tsx
'use client';

import { signIn } from 'next-auth/react';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex justify-center items-center p-8">
      <button
        onClick={() => signIn('google', { callbackUrl: '/' })}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Sign in with Google
      </button>
    </div>
  );
}
