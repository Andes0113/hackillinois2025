'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { sendEmail } from '@/lib/gmail';
import MailForm from 'app/components/MailForm';

export default function SendEmailPage() {
  return <MailForm />;
}
