'use client';

import styles from './Header.module.css';
import { signIn, useSession } from 'next-auth/react';

const Header = () => {
  const { data: session, status } = useSession();

  const handleSignIn = async () => {
    try {
      // Trigger the sign-in process without a callbackUrl
      await signIn('google');
    } catch (error) {
      console.error('Error during sign-in:', error);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.logo}>🌐</div>
      <div className={styles.title}>Clustermail</div>
      <div className={styles.buttonContainer}>
        {status === 'authenticated' ? (
          <button className={styles.button} onClick={() => alert('Navigate to Profile')}>
            Profile
          </button>
        ) : (
          <button className={styles.button} onClick={handleSignIn}>
            Login
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;