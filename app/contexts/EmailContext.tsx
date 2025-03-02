'use client';
import fetchEmails from '@/lib/gmail';
import {
  createEmailGroups,
  getUserGroups,
  groupsAreInitialized,
  addEmailToGroup as serverAddEmailToGroup,
  editGroupName as serverEditGroupName
} from '@/lib/groups';
import { useSession } from 'next-auth/react';
import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useEffect,
  useState
} from 'react';
import type { EmailType } from 'types';

type EmailContextValues = {
  selectedGroupId: number | null;
  setSelectedGroupId: Dispatch<SetStateAction<number | null>> | null;
  emails: EmailType[];
  emailsLoading: Boolean;
  groups: Group[];
  groupsLoading: Boolean;
  fetchAndSetEmails: () => Promise<void>;
  addEmailToGroup: (groupId: number, emailId: string) => Promise<void>;
  editGroupName: (groupId: number, name: string) => Promise<void>;
};

export type Group = {
  group_id: number;
  name: string;
  emails: EmailType[];
};

const EmailContext = createContext<EmailContextValues>({
  selectedGroupId: null,
  setSelectedGroupId: () => {},
  emails: [],
  emailsLoading: true,
  groups: [],
  groupsLoading: true,
  fetchAndSetEmails: async () => { },
  addEmailToGroup: async (groupId: number, emailId: string) => { },
  editGroupName: async (groupId: number, name: string) => { }
});

export function useEmailContext() {
  const context = useContext(EmailContext);
  if (!context) {
    throw new Error(
      'useEmailContext must be used within an EmailContextProvider'
    );
  }
  return context;
}

interface EmailContextProviderProps {
  children: ReactNode;
}

export default function EmailContextProvider({
  children
}: EmailContextProviderProps) {
  const { data: session, status } = useSession();

  const [selectedGroupId, setSelectedGroupId] = useState<number| null>(null);
  const [emailsLoading, setEmailsLoading] = useState<Boolean>(true);
  const [emails, setEmails] = useState<EmailType[]>([]);
  const [groupsLoading, setGroupsLoading] = useState<Boolean>(true);
  const [groups, setGroups] = useState<Group[]>([]);

  async function fetchAndSetEmails() {
    const emails = await fetchEmails(session!.accessToken!, 30);

    setEmailsLoading(false);
    setEmails(emails.filter((email) => email.to !== undefined));
  }

  async function fetchAndSetGroups() {
    const groupsInitialized = await groupsAreInitialized(session!.user!.email!);

    // Costly
    if (!groupsInitialized) await createEmailGroups(session!.user!.email!);

    const groups = await getUserGroups(
      session!.user!.email!,
      session!.accessToken!
    );

    setGroups(groups);
    setGroupsLoading(false);
  }

  useEffect(() => {
    console.log('from context', session);
    if (session?.user) {
      fetchAndSetEmails();
      fetchAndSetGroups();
    }
  }, [session]);

  async function addEmailToGroup(groupId: number, emailId: string) {
    await serverAddEmailToGroup(session!.user!.email!, groupId, emailId);

    fetchAndSetGroups();
  }

  async function editGroupName(groupId: number, newName: string) {
    try {
      await serverEditGroupName(session!.user!.email!, groupId, newName);
      const editedGroup = groups.find((group) => group.group_id == groupId);
      setGroups([
        ...groups.filter((group: Group) => group.group_id !== groupId),
        {
          ...editedGroup!,
          name: newName
        }
      ]);
    } catch (error) { }
  }

  const value: EmailContextValues = {
    selectedGroupId,
    setSelectedGroupId,
    emailsLoading,
    emails,
    groups,
    groupsLoading,
    fetchAndSetEmails,
    addEmailToGroup,
    editGroupName
  };

  return (
    <EmailContext.Provider value={value}>{children}</EmailContext.Provider>
  );
}
