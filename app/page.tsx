'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to /graphview after successful sign-in
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/graphview');
    }
  }, [status, router]);
  return (
    <div className="flex items-center justify-center h-screen">
      <h1 className="text-4xl font-bold">Welcome to ClusterMail</h1>
    </div>
  );
}