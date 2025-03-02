"use client"

import React, { useState } from "react";
import ReactFlow, { Node, Edge, applyEdgeChanges, applyNodeChanges, addEdge, ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";
import CustomNode from "./CustomNode";
import EmailPopup from "./EmailPopup";
import styles from "./FlowCanvas.module.css";

interface EmailProps {
  sender: string;
  receiver: string;
  dateSent: string;
  subject?: string;
  message?: string;
  daysAgo: number;
}

const nodeTypes = {
  custom: CustomNode,
};

const FlowDiagram: React.FC = () => {

  const [sharedPopupState, setSharedPopupState] = useState<boolean>(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailProps | null>(null);
  const updateSharedPopupState = (email: EmailProps, state: boolean) => {
    setSharedPopupState(state);
    setSelectedEmail(email);
  };

  const emailData: EmailProps[] = [
    { sender: "person1", receiver: "person2", subject: "subject1", message: "body1", dateSent: "2023-10-01", daysAgo: 1 },
    { sender: "person3", receiver: "person4", subject: "subject2", message: "body2", dateSent: "2023-10-02", daysAgo: 10 },
    { sender: "person5", receiver: "person6", subject: "subject3", message: "body3", dateSent: "2023-10-03", daysAgo: 20 },
    { sender: "person1", receiver: "person2", subject: "subject1", message: "body1", dateSent: "2023-10-01", daysAgo: 1 },
    { sender: "person3", receiver: "person4", subject: "subject2", message: "body2", dateSent: "2023-10-02", daysAgo: 10 },
    { sender: "person5", receiver: "person6", subject: "subject3", message: "body3", dateSent: "2023-10-03", daysAgo: 20 },
  ];

  const createGraph = (data: EmailProps[]) => {
    const numCenters = 3; // Number of center nodes
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
        data: { label: `Central Node ${j + 1}` },
        type: 'default',
      });

      for (let i = 0; i < data.length / numCenters; i++) {
        const angle = (2 * Math.PI * i) / (data.length / numCenters);
        const radius_added = radius + Math.floor(Math.random() * 100);
        const x = centerX + j * 300 + radius_added * Math.cos(angle);
        const y = centerY + radius_added * Math.sin(angle);
        const email = data[i + j * (data.length / numCenters)];

        nodes.push({
          id: `${j}-${i + 1}`,
          type: "custom",
          position: { x: x, y: y },
          data: { ...email, onClick: () => updateSharedPopupState(email, true) }
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

  const { nodes: initialNodes, edges: initialEdges } = createGraph(emailData);
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const onNodesChange = (changes: any) => setNodes((nds) => applyNodeChanges(changes, nds));
  const onEdgesChange = (changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds));
  const onConnect = (connection: any) => setEdges((eds) => addEdge(connection, eds));

  return (
    <>
      <div className={styles.flowCanvas}>
        <ReactFlowProvider>
          <ReactFlow
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