// gmail.ts
import { google } from 'googleapis';

export default async function fetchEmails(accessToken: string) {
  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: 'v1', auth });

    // List messages (up to 10 emails)
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10,
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

        return { subject, from };
      })
    );

    return emailDetails;
  } catch (error) {
    console.error('Error fetching emails:', error);
    return [];
  }
}
