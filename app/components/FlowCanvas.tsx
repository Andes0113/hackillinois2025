"use client"

import React, { Dispatch, SetStateAction, useCallback, useState } from "react";
import ReactFlow, { Node, Edge, applyEdgeChanges, applyNodeChanges, addEdge, ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";
import EmailNode from "./EmailNode";
import EmailPopup from "./EmailPopup";
import styles from "./FlowCanvas.module.css";
import { EmailType } from "types";
import { Group } from "app/contexts/EmailContext";
import GroupNode from "./GroupNode";

const nodeTypes = {
  email: EmailNode,
  group: GroupNode
};

interface FlowDiagramProps {
  groups: Group[];
  selectedGroupId: number | null;
  setSelectedGroupId: Dispatch<SetStateAction<number | null>> | null;
}

const FlowDiagram = ({ groups, selectedGroupId, setSelectedGroupId }: FlowDiagramProps) => {

  const [sharedPopupState, setSharedPopupState] = useState<boolean>(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailType | null>(null);
  const updateSharedPopupState = (email: EmailType, state: boolean) => {
    setSharedPopupState(state);
    setSelectedEmail(email);
  };

  // const emailData: EmailType[] = [
  //   { message_id: "1", from: "person1", to: "person2", subject: "subject1", strippedBody: "body1", date: "2023-10-01" },
  //   { message_id: "2", from: "person3", to: "person4", subject: "subject2", strippedBody: "body2", date: "2023-10-02" },
  //   { message_id: "3", from: "person5", to: "person6", subject: "subject3", strippedBody: "body3", date: "2023-10-03" },
  //   { message_id: "4", from: "person1", to: "person2", subject: "subject1", strippedBody: "body1", date: "2023-10-01" },
  //   { message_id: "5", from: "person3", to: "person4", subject: "subject2", strippedBody: "body2", date: "2023-10-02" },
  //   { message_id: "6", from: "person5", to: "person6", subject: "subject3", strippedBody: "body3", date: "2023-10-03" },
  // ];

  const emailData: Group[] = [
    {
      group_id: 1,
      name: "Engineering Team",
      emails: [
        {
          subject: "Project Update",
          from: "alice@example.com",
          to: "team@example.com",
          message_id: "msg-001",
          date: "2025-03-01T10:00:00Z",
          strippedBody: "Project is on track for completion."
        },
        {
          subject: "Bug Fixes",
          from: "bob@example.com",
          to: "team@example.com",
          message_id: "msg-002",
          date: "2025-03-02T12:30:00Z",
          strippedBody: "Fixed critical bugs in module X."
        }
      ]
    },
    {
      group_id: 2,
      name: "Marketing Team",
      emails: [
        {
          subject: "Campaign Launch",
          from: "carol@example.com",
          to: "marketing@example.com",
          message_id: "msg-003",
          date: "2025-03-01T15:45:00Z",
          strippedBody: "Launching the new campaign next week."
        },
        {
          subject: "Meeting Reminder",
          from: "dave@example.com",
          to: "marketing@example.com",
          message_id: "msg-004",
          date: "2025-03-02T08:15:00Z",
          strippedBody: "Reminder: Team meeting at 3 PM."
        }
      ]
    },
    {
      group_id: 3,
      name: "HR Department",
      emails: [
        {
          subject: "Policy Update",
          from: "hr@example.com",
          to: "all@example.com",
          message_id: "msg-005",
          date: "2025-03-01T09:00:00Z",
          strippedBody: "Updated remote work policy."
        }
      ]
    },
    {
      group_id: 4,
      name: "Sales Team",
      emails: [
        {
          subject: "Monthly Targets",
          from: "saleslead@example.com",
          to: "sales@example.com",
          message_id: "msg-006",
          date: "2025-03-01T11:30:00Z",
          strippedBody: "We need to hit our sales goals this month."
        },
        {
          subject: "Client Follow-ups",
          from: "rep@example.com",
          to: "sales@example.com",
          message_id: "msg-007",
          date: "2025-03-02T14:20:00Z",
          strippedBody: "Follow up with key clients for renewals."
        }
      ]
    },
    {
      group_id: 5,
      name: "Support Team",
      emails: [
        {
          subject: "New Ticket Assignments",
          from: "support@example.com",
          to: "helpdesk@example.com",
          message_id: "msg-008",
          date: "2025-03-01T13:10:00Z",
          strippedBody: "New tickets have been assigned."
        },
        {
          subject: "Resolved Tickets",
          from: "agent@example.com",
          to: "helpdesk@example.com",
          message_id: "msg-009",
          date: "2025-03-02T16:45:00Z",
          strippedBody: "Several tickets have been resolved today."
        }
      ]
    }
  ];

  const createGraph = (data: Group[]) => {
    // if (groupsLoading) return { nodes: [], edges: [] };

    const numCenters = data.length;
    const centerX = 400;
    const centerY = 300;
    const radius = 200;
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    for (let j = 0; j < numCenters; j++) {
      const centerId = `center-${j}`;
      nodes.push({
        id: centerId,
        position: { x: centerX + j * 300, y: centerY },
        data: { group: data[j], selectedGroupId, setSelectedGroupId },
        type: 'group',
      });

      for (let i = 0; i < data[j].emails.length; i++) {
        const angle = (2 * Math.PI * i) / data[j].emails.length;
        const radius_added = radius + Math.floor(Math.random() * 100);
        const x = centerX + j * 300 + radius_added * Math.cos(angle);
        const y = centerY + radius_added * Math.sin(angle);
        const email = data[j].emails[i];

        nodes.push({
          id: `${j}-${i + 1}`,
          type: "email",
          position: { x: x, y: y },
          data: { email, onClick: () => updateSharedPopupState(email, true) }
        });

        edges.push({
          id: `edge-${j}-${i}`,
          source: centerId,
          target: `${j}-${i + 1}`,
          animated: true,
        });
      }
    }

    return { nodes, edges };
  };

  const { nodes: initialNodes, edges: initialEdges } = createGraph(groups);
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const onSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
    const selectedGroupNode = nodes.find((node) => node.selected && node.type == 'group')
    if (setSelectedGroupId) {
      if (selectedGroupNode) {
        setSelectedGroupId(selectedGroupNode.data.group.group_id!);
      } else {
        setSelectedGroupId(null);
      }  
    }
  }, []);

  const onNodesChange = (changes: any) => setNodes((nds) => applyNodeChanges(changes, nds));
  const onEdgesChange = (changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds));
  const onConnect = (connection: any) => setEdges((eds) => addEdge(connection, eds));

  return (
    <>
      <div className={styles.flowCanvas}>
        <ReactFlowProvider>
          <ReactFlow
            onSelectionChange={onSelectionChange}
            className={styles.reactFlow}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
          />
        </ReactFlowProvider>
      </div>
      {sharedPopupState && selectedEmail && <EmailPopup
        onClose={() => setSharedPopupState(false)}
        sender={selectedEmail.from}
        receiver={selectedEmail.to}
        dateSent={selectedEmail.date}
        subject={selectedEmail.subject}
        message={selectedEmail.strippedBody}
      />}
    </>
  );
};

export default FlowDiagram;