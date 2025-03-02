'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { sendEmail } from '@/lib/gmail';

export default function MailForm() {
  const { data: session, status } = useSession();
  const [subject, setSubject] = useState('');
  const [recipient, setRecipient] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await sendEmail(
        session!.accessToken!,
        session!.user!.email!,
        subject,
        recipient,
        body
      );

      setMessage('Email sent successfully!');
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!session) return <div></div>;

  return (
    <div className="border border-gray-500 p-4">
      <form className="border m-2 p-2 rounded-lg" onSubmit={handleSubmit}>
        <h1 className="text-2xl">Send Mail</h1>
        <input
          className="w-full flex border-b border-gray-300 px-1 py-1"
          placeholder="Subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />

        <input
          className="w-full border-b border-gray-300 px-1 py-1"
          placeholder="Recipients"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          required
        />
        <div>
          <textarea
            className="border mt-2 border-gray-300 w-full rounded-lg p-1"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            required
          />
        </div>
        <button
          className="py-2 px-4 rounded-lg bg-cyan-400 text-white border-2 border-cyan-400 hover:border-cyan-500"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Send Email'}
        </button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}
