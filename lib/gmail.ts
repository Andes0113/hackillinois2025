'use server';
// gmail.ts
import { gmail_v1, google } from 'googleapis';
import { client } from './db';

function stripHtml(html: string): string {
  return html
    .replace(/<style([\s\S]*?)<\/style>/gi, '')
    .replace(/<script([\s\S]*?)<\/script>/gi, '')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '- ')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<[^>]+>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

function stripImage(text: string): string {
  return text.replace(/\[image:\s*(?:.|\n)*?\]/g, '');
}
function stripLink(text: string): string {
  return text.replace(/https?:\/\/[^\s]+|www\.[^\s]+/g, '');
}

export async function fetchEmailById(gmailClient: gmail_v1.Gmail, id?: string) {
  if (!id) return { subject: 'No ID', from: 'Unknown' };

  try {
    const email = await gmailClient.users.messages.get({
      userId: 'me',
      id
    });

    const headers = email.data.payload?.headers || [];
    const subject =
      headers.find((h) => h.name === 'Subject')?.value || 'No Subject';
    const from =
      headers.find((h) => h.name === 'From')?.value || 'Unknown Sender';
    const to =
      headers.find((h) => h.name === 'To')?.value || 'Unknown Receiver';
    const message_id = email.data.id;
    const date =
      headers.find((h) => h.name === 'Date-Id')?.value || 'Unknown Date';
    let body = 'No Body';
    if (email.data.payload?.body?.data) {
      body = Buffer.from(email.data.payload.body.data, 'base64').toString();
    } else if (email.data.payload?.parts) {
      const textPart = email.data.payload.parts.find(
        (p) => p.mimeType === 'text/plain'
      );
      if (textPart && textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString();
      } else {
        const nextPart = email.data.payload.parts.find(
          (p) => p.mimeType === 'multipart/alternative'
        );
        const nextTextPart = nextPart?.parts?.find(
          (p) => p.mimeType === 'text/plain'
        );
        if (nextTextPart && nextTextPart?.body?.data) {
          body = Buffer.from(nextTextPart.body.data, 'base64').toString();
        }
      }
    }

    const strippedBody = stripLink(stripImage(stripHtml(body)));

    return { subject, from, to, message_id, date, strippedBody };
  } catch (err) {
    console.error('Error fetching emails:', err);
    return {};
  }
}

export async function batchFetchEmailContent(
  accessToken: string,
  ids: string[]
) {
  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const tokenInfo = await auth.getTokenInfo(accessToken);

    const gmail = google.gmail({ version: 'v1', auth });

    const emails = await Promise.all(
      ids.map((id) => fetchEmailById(gmail, id))
    );

    return emails;
  } catch (err) {
    console.error(err);
    return [];
  }
}

export default async function fetchEmails(
  accessToken: string,
  daysAgo: number
) {
  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const tokenInfo = await auth.getTokenInfo(accessToken);

    const gmail = google.gmail({ version: 'v1', auth });

    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const formattedDate = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;

    // List messages (up to last daysAgo days)
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: `after:${formattedDate}`
    });

    const messages = response.data.messages || [];

    // Fetch each email’s details concurrently
    const emails = await Promise.all(
      messages.map(async (msg) => fetchEmailById(gmail, msg.id!))
    );

    return emails;
  } catch (error) {
    console.error('Error fetching emails:', error);
    return [];
  }
}

export async function fetchAndStoreEmails(
  userEmail: string,
  accessToken: string,
  daysAgo: number
) {
  const emails = await fetchEmails(accessToken, daysAgo);

  try {
    const query = `
      INSERT INTO Emails (user_email_address, email_id, sender_email, receiver_emails, subj, body)
      VALUES ${emails.map((_, i) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`).join(', ')}
      ON CONFLICT (email_id) DO NOTHING;`;

    const values = emails.flatMap((email) => [
      userEmail,
      email.message_id,
      email.from,
      email.to,
      email.subject,
      email.strippedBody
    ]);

    await client.query(query, values);
  } catch (err) {
    console.error('Error inserting emails:', err);
  }

  // console.log(emails);
}

export async function sendEmail(
  accessToken: string,
  userEmail: string,
  subject: string,
  recipient: string,
  body: string
) {
  console.log('access: ', accessToken);
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const tokenInfo = await auth.getTokenInfo(accessToken);

  const message = [
    `From: ${userEmail}`,
    `To: ${recipient}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    body
  ].join('\r\n');

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const gmail = google.gmail({ version: 'v1', auth });

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage
    }
  });
}
