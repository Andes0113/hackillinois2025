"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { sendEmail } from "@/lib/gmail";

export default function EmailForm() {
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
      console.log(session);
      await sendEmail(session!.accessToken!, session!.user!.email!, subject, recipient, body);
      // const response = await fetch('/api/send-email', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ accessToken: , userEmail: session?.user?.email, subject, recipient, body }),
      // });

      // const data = await response.json();
      // if (!response.ok) throw new Error(data.error || 'Failed to send email');

      setMessage('Email sent successfully!');
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!session) return <div></div>

  return (
    <div>
      <h1>Send Email</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Your Email:</label>
          <p>{session!.user!.email}</p>
        </div>
        <div>
          <label>Subject:</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Recipient Email:</label>
          <input
            type="email"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Body:</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send Email'}
        </button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}
