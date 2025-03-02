"use client"

import React, { useState } from "react";
import ReactFlow, { Controls, Node, Edge } from "reactflow";
import "reactflow/dist/style.css";
import CustomNode from "./CustomNode";
import EmailPopup from "./EmailPopup";


const FlowDiagram: React.FC = () => {

  const nodeTypes = { custom: CustomNode };
  const [sharedPopupState, setSharedPopupState] = useState<boolean>(false);
  const updateSharedPopupState = (state: boolean) => {
    console.log("updated state to ", state);
    setSharedPopupState(state);
  };

  const emailData = [
    { to: "person1", from: "person2", subject: "subject1", body: "body1", date: "2023-10-01", attachments: ["file1"], labels: ["label1"], daysAgo: 1 },
    { to: "person3", from: "person4", subject: "subject2", body: "body2", date: "2023-10-02", attachments: ["file2"], labels: ["label2"], daysAgo: 10 },
    { to: "person5", from: "person6", subject: "subject3", body: "body3", date: "2023-10-03", attachments: ["file3"], labels: ["label3"], daysAgo: 15 },
  ]

  const initialNodes: Node[] = Array.from(
    emailData,
    (email, i) => ({
      id: `${i + 1}`,
      type: "custom",
      position: { x: Math.random() * 200 - 100, y: email.daysAgo * 50 },
      data: { ...email, onClick: () => updateSharedPopupState(true) },
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
      {sharedPopupState && <EmailPopup onClose={() => updateSharedPopupState(false)} />}
    </>
  );
};

export default FlowDiagram;