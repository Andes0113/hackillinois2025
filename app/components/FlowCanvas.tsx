"use client";

import React from "react";
import { ReactFlow, Controls, Background } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import EmailNode from "./EmailNode";

const nodeTypes = {
  emailNode: EmailNode,
};

const emailArray = [
  { to: "Node 1", from: "Node 1", body: "Body 1", daysAgo: 1 },
  { to: "Node 2", from: "Node 2", body: "Body 2", daysAgo: 10 },
  { to: "Node 3", from: "Node 3", body: "Body 3", daysAgo: 15 },
]

const nodes = Array.from(emailArray, (email, i) => ({
  id: `${i + 1}`,
  type: 'emailNode',
  position: { x: Math.random() * 200 - 100, y: email.daysAgo * 25 },
  data: { to: `Node ${i + 1}` },
  style: {
    border: "2px solid #000",
    borderRadius: "10px",
    padding: "10px",
    backgroundColor: "#f0f0f0",
  },
}));

const edges = [
  { id: "e1-2", source: "1", target: "2" },
  { id: "e2-3", source: "2", target: "3" },
];

function FlowCanvas() {
  return (
    <div style={{ height: "100vh", width: "80vw" }}>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes}>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default FlowCanvas;
