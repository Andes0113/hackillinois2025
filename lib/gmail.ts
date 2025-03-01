// gmail.ts
import { google } from 'googleapis';
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

function stripImage(text: string) : string {
  return text.replace(/\[image:\s*(?:.|\n)*?\]/g, '');
}
function stripLink(text: string) : string {
  return text.replace(/https?:\/\/[^\s]+|www\.[^\s]+/g, '');
}

export default async function fetchEmails(accessToken: string, daysAgo: number) {
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
      q: `after:${formattedDate}`,
    });

    const messages = response.data.messages || [];

    // Fetch each email’s details concurrently
    const emailDetails = await Promise.all(
      messages.map(async (msg) => {
        if (!msg.id) return { subject: 'No ID', from: 'Unknown' };

        const email = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
        });

        const headers = email.data.payload?.headers || [];
        const subject = headers.find((h) => h.name === 'Subject')?.value || 'No Subject';
        const from = headers.find((h) => h.name === 'From')?.value || 'Unknown Sender';
        const to = headers.find((h) => h.name === 'To')?.value || 'Unknown Receiver';
        const message_id = email.data.id;
        const date = headers.find((h) => h.name === 'Date-Id')?.value || 'Unknown Date';
        let body = 'No Body'
        if (email.data.payload?.body?.data) {
          body = Buffer.from(email.data.payload.body.data, 'base64').toString();
        } else if (email.data.payload?.parts) {
          const textPart = email.data.payload.parts.find((p) => p.mimeType === 'text/plain');
          if (textPart && textPart?.body?.data) {
            body = Buffer.from(textPart.body.data, 'base64').toString();
          } else {
            const nextPart = email.data.payload.parts.find((p) => p.mimeType === 'multipart/alternative')
            const nextTextPart = nextPart?.parts?.find((p) => p.mimeType === 'text/plain')
            if (nextTextPart && nextTextPart?.body?.data) {
              body = Buffer.from(nextTextPart.body.data, 'base64').toString();
            }
          }

        }

        const strippedBody = stripLink(stripImage(stripHtml(body)));
        console.log(strippedBody)
        return { subject, from, to, message_id, date, strippedBody};
      })
    );

    return emailDetails;
  } catch (error) {
    console.error('Error fetching emails:', error);
    return [];
  }
}

export async function fetchAndStoreEmails(userEmail: string, accessToken: string) {
  const emails = await fetchEmails(accessToken, 30);

  try {
    const query = `
      INSERT INTO Emails (user_email_address, email_id, sender_email, receiver_emails, subj, body)
      VALUES ${emails.map((_, i) => `($${i*5+1}, $${i*5+2}, $${i*5+3}, $${i*5+4}, $${i*5+5})`).join(', ')}
    `;
    const values = emails.flatMap(email => [userEmail, email.message_id, email.from, email.from, email.subject, email.strippedBody]);

    // await client.query(query, values);
  
  } catch (err) {
    console.error('Error inserting emails:', err);
  }

  console.log(emails);
 }