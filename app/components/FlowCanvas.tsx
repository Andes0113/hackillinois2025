"use client"

import React, { useState } from "react";
import ReactFlow, { Controls, Node, Edge } from "reactflow";
import "reactflow/dist/style.css";
import CustomNode from "./CustomNode";
import EmailPopup from "./EmailPopup";


interface EmailProps {
  sender: string;
  receiver: string;
  dateSent: string;
  subject?: string;
  message?: string;
  daysAgo: number;
}

const FlowDiagram: React.FC = () => {

  const nodeTypes = { custom: CustomNode };
  const [sharedPopupState, setSharedPopupState] = useState<boolean>(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailProps | null>(null);
  const updateSharedPopupState = (email: EmailProps, state : boolean) => {
    console.log("updated state to ", state);
    setSharedPopupState(state);
    setSelectedEmail(email);
  };

  const emailData: EmailProps[] = [
    { sender: "person1", receiver: "person2", subject: "subject1", message: "body1", dateSent: "2023-10-01", daysAgo: 1},
    { sender: "person3", receiver: "person4", subject: "subject2", message: "body2", dateSent: "2023-10-02", daysAgo: 10},
    { sender: "person5", receiver: "person6", subject: "subject3", message: "body3", dateSent: "2023-10-03", daysAgo: 20},
  ]

  const initialNodes: Node[] = Array.from(
    emailData,
    (email, i) => ({
      id: `${i + 1}`,
      type: "custom",
      position: { x: Math.random() * 200 - 100, y: email.daysAgo * 50 },
      data: { ...email, onClick: () => updateSharedPopupState(email, true) },
    })
  );

  const initialEdges: Edge[] = [
    { id: "e1-2", source: "1", target: "2", animated: true },
    { id: "e1-3", source: "1", target: "3", animated: true },
  ];

  return (
    <>
      <div style={{ width: "100vw", height: "100vh" }}>
        <ReactFlow nodes={initialNodes} edges={initialEdges} nodeTypes={nodeTypes}>
          <Controls />
        </ReactFlow>
      </div>
      {sharedPopupState && selectedEmail != null && <EmailPopup 
        onClose={() => setSharedPopupState(false)}
        sender={selectedEmail.sender}
        receiver={selectedEmail.receiver}
        dateSent={selectedEmail.dateSent}
        subject={selectedEmail.subject}
        message={selectedEmail.message}
      />}
    </>
  );
};

export default FlowDiagram;