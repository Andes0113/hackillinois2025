'use server';

import axios from 'axios';
import { client } from './db';
import { batchFetchEmailContent } from './gmail';

export async function groupsAreInitialized(userEmail: string) {
  try {
    const query =
    'select count(*) from Groups where Groups.user_email_address = $1';
    const { rows } = await client.query(query, [userEmail]);
    const numGroups = rows[0].count;
    
    return numGroups > 0;
  } catch (error) {
    return false;
  }
}

// Call to generate the clusters using BERT
// Don't await on this function
export async function createEmailGroups(userEmail: string) {
  console.log('Create Email Groups')
  try {
    await axios.get(process.env.TOPICSERVER_URL!, {
      params: { user_email: userEmail }
    });
  } catch (error) {
    return error;
  }
}

// Get User Groups from Postgres
export async function getUserGroups(userEmail: string, accessToken: string) {
  try {
    const query =
      'select Groups.group_id, Groups.name, GroupEmail.email_id from Groups join GroupEmail on Groups.group_id = GroupEmail.group_id where Groups.user_email_address = $1';
    const { rows } = await client.query(query, [userEmail]);

    const emailIds = Array.from(
      new Set(rows.map((groupEntry): string => groupEntry.email_id))
    );
    const emailContent = await batchFetchEmailContent(accessToken, emailIds);
    const emailMap: { [id: string]: Object } = {};
    emailContent.forEach((email) => {
      emailMap[email.message_id!] = email;
    });
    const groups = rows.reduce((acc, curr) => {
      const existingGroup = acc.find(
        (item: any) => item.group_id === curr.group_id
      );

      if (existingGroup) {
        existingGroup.emails.push(emailMap[curr.email_id]);
      } else {
        acc.push({
          group_id: curr.group_id,
          name: curr.name,
          emails: [emailMap[curr.email_id]]
        });
      }

      return acc;
    }, []);

    return groups;
  } catch (error) {
    return [];
  }
}

export async function editGroupName(
  userEmail: string,
  groupId: number,
  newName: string
) {
  const query = `update Groups set name=$3 where user_email_address=$1 and group_id=$2`;
  const values = [userEmail, groupId, newName];
  await client.query(query, values);
}

async function emailExistsInGroup(
  userEmail: string,
  groupId: number,
  emailId: string
) {
  try {
    const query = `select * from GroupEmail where user_email_address=$1 and group_id = $2 and email_id = $3;`;
    const values = [userEmail, groupId, emailId];
    const { rows } = await client.query(query, values);

    return rows.length > 0;
  } catch (error) {
    console.log('error adding email to group', error);
  }
}

export async function addEmailToGroup(
  userEmail: string,
  groupId: number,
  emailId: string
) {
  try {
    if (await emailExistsInGroup(userEmail, groupId, emailId)) {
      console.log('exists');
      return;
    }
    const query = `insert into GroupEmail (user_email_address, group_id, email_id) values ($1, $2, $3)`;
    const values = [userEmail, groupId, emailId];
    await client.query(query, values);
  } catch (error) {
    console.log('error adding email to group', error);
  }
}
