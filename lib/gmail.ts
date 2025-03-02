// gmail.ts
import { gmail_v1, google } from 'googleapis';
import { client } from './db';
import OpenAI from "openai";



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

async function generateSummary(subject: string | undefined, body: string | undefined, emailId: string | null | undefined) : Promise<string> {
  if (subject === undefined || body === undefined || !emailId || emailId  == undefined) {
    return "No subject or body";
  }
  try {
    const openai = new OpenAI();
    const prompt = `
    You are an AI assistant that extracts the most important details from an email. Given an email with a title and body, extract a list of keywords separated by only spaces. Do not use bullet points. Ignore all unnecessary components like html, css, and urls. The summary should be short but retain all relevant semantic meaning to facilitate similarity comparisons.

  
    Title: "${subject}"
  
    Body: "${body}"
    `;

    const query = "SELECT EXISTS (SELECT 1 FROM Emails WHERE email_id = $1)";
    const res = await client.query(query, [emailId]);

    const emailExists = res.rows[0].exists;
    if (emailExists) {
        const query2 = `
        SELECT summary FROM Emails WHERE email_id = $1;
      `;
      
      const res2 = await client.query(query2, [emailId]);
      return res2.rows[0];
    }
  
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
          { role: "system", content: "You are an AI assistant that extracts the most important details from an email." },
          {
              role: "user",
              content: prompt,
          },
      ],
      store: true,
    });
  
    const summary = response.choices?.[0]?.message?.content?.trim() || "No summary generated.";
    return summary;

  }
    catch (error) {
      console.error("Error generating summary:", error);
      return "Error generating summary.";
  }

}

export async function fetchEmailById(gmailClient: gmail_v1.Gmail, id?: string) {
  if (!id) return { subject: 'No ID', from: 'Unknown' };

  try {
    const email = await gmailClient.users.messages.get({
      userId: 'me',
      id,
    });

    const headers = email.data.payload?.headers || [];
    const subject = headers.find((h) => h.name === 'Subject')?.value || 'No Subject';
    const from = headers.find((h) => h.name === 'From')?.value || 'Unknown Sender';
    const to = headers.find((h) => h.name === 'To')?.value || 'Unknown Receiver';
    const message_id = email.data.id;
    const dateHeader = headers.find((h) => h.name === 'Date')?.value;
    let dateSent = null;
    if (dateHeader) {
      const parsedDate = new Date(dateHeader);
      dateSent = parsedDate.toISOString().replace("T", " ").split(".")[0]; // Format: 'YYYY-MM-DD HH:MI:SS'
    }

    let body = 'No Body';
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

    return { subject, from, to, message_id, dateSent, strippedBody};
  } catch (err) {
    console.error('Error fetching emails:', err);
    return {};
  }
}

export async function batchFetchEmailContent(accessToken: string, ids: string[]) {
  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const tokenInfo = await auth.getTokenInfo(accessToken);

    const gmail = google.gmail({ version: 'v1', auth });

    const emails = await Promise.all(ids.map((id) => 
      fetchEmailById(gmail, id)
    ));

    return emails;
  } catch (err) {
    console.error(err);
    return [];
  }
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
    const emails = await Promise.all(
      messages.map(async (msg) => fetchEmailById(gmail, msg.id!))
    );

    return emails;
  } catch (error) {
    console.error('Error fetching emails:', error);
    return [];
  }
}

export async function fetchAndStoreEmails(userEmail: string, accessToken: string, daysAgo: number) {
  const emails = await fetchEmails(accessToken, daysAgo);

  try {
    const query = `
      INSERT INTO Emails (user_email_address, email_id, sender_email, receiver_emails, subj, body, summary, date_sent)
      VALUES ${emails.map((_, i) => 
        `($${i*8+1}, $${i*8+2}, $${i*8+3}, $${i*8+4}, $${i*8+5}, $${i*8+6}, $${i*8+7}, $${i*8+8})`
      ).join(', ')}
      ON CONFLICT (email_id) DO NOTHING;
    `;

    const values = await Promise.all(emails.map(async email => [
      userEmail, 
      email.message_id, 
      email.from, 
      email.to, 
      email.subject, 
      email.strippedBody, 
      await generateSummary(email.subject, email.strippedBody, email.message_id), 
      email.dateSent
    ])).then(results => results.flat()); // Flatten nested arrays

    await client.query(query, values);
  } catch (err) {
    console.error('Error inserting emails:', err);
  }
 }