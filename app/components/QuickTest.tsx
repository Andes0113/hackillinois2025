'use client';
import React, { useState, FormEvent } from 'react';
import { useEmailContext } from 'app/contexts/EmailContext';
import { EmailType } from '../../types';

const EmailContextTestForm: React.FC = () => {
  const {
    emails,
    emailsLoading,
    groups,
    groupsLoading,
    fetchAndSetEmails,
    addEmailToGroup,
    editGroupName
  } = useEmailContext();

  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedEmail, setSelectedEmail] = useState<string>('');
  const [newGroupName, setNewGroupName] = useState<string>('');

  const handleAddEmailToGroup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedGroup && selectedEmail) {
      await addEmailToGroup(parseInt(selectedGroup), selectedEmail);
      alert('Email added to group successfully!');
    }
  };

  const handleEditGroupName = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedGroup && newGroupName) {
      await editGroupName(parseInt(selectedGroup), newGroupName);
      alert('Group name updated successfully!');
    }
  };

  if (groupsLoading || emailsLoading) return <div></div>;

  return (
    <div>
      <h2>Email Context Test Form</h2>

      <button onClick={() => fetchAndSetEmails()}>
        {emailsLoading ? 'Loading Emails...' : 'Refresh Emails'}
      </button>

      <form onSubmit={handleAddEmailToGroup}>
        <h3>Add Email to Group</h3>
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
        >
          <option value="">Select a group</option>
          {groups.map((group) => (
            <option key={group.group_id} value={group.group_id.toString()}>
              {group.name}
            </option>
          ))}
        </select>
        <select
          value={selectedEmail}
          onChange={(e) => setSelectedEmail(e.target.value)}
        >
          <option value="">Select an email</option>
          {emails.map((email: EmailType) => (
            <option key={email.message_id} value={email.message_id!}>
              {email.subject}
            </option>
          ))}
        </select>
        <button type="submit" disabled={!selectedGroup || !selectedEmail}>
          Add Email to Group
        </button>
      </form>

      <form onSubmit={handleEditGroupName}>
        <h3>Edit Group Name</h3>
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
        >
          <option value="">Select a group</option>
          {groups.map((group) => (
            <option key={group.group_id} value={group.group_id.toString()}>
              {group.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="New group name"
        />
        <button type="submit" disabled={!selectedGroup || !newGroupName}>
          Update Group Name
        </button>
      </form>

      <div>
        <h3>Emails ({emails.length})</h3>
        <ul>
          {emails.slice(0, 10).map((email: EmailType) => (
            <li key={email.message_id}>{email.subject}</li>
          ))}
        </ul>
      </div>

      <div>
        <h3>Groups ({groups.length})</h3>
        <ul>
          {groups.map((group) => (
            <li key={group.group_id}>
              {group.name} ({group.emails.length} emails)
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default EmailContextTestForm;
