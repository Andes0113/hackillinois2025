"use client"

import React from "react";
import ReactFlow, { Controls, Node, Edge } from "reactflow";
import "reactflow/dist/style.css";
import CustomNode from "./CustomNode";

const nodeTypes = { custom: CustomNode };

const initialNodes: Node[] = [
  {
    id: "1",
    type: "custom",
    position: { x: 250, y: 100 },
    data: { label: "Custom Node 1" },
  },
  {
    id: "2",
    type: "custom",
    position: { x: 100, y: 200 },
    data: { label: "Custom Node 2" },
  },
  {
    id: "3",
    type: "custom",
    position: { x: 350, y: 150 },
    data: { label: "Custom Node 3" },
    draggable: true,
  },
];

const initialEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2", animated: true },
  { id: "e1-3", source: "1", target: "3", animated: true },
];

const FlowDiagram = () => {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ReactFlow nodes={initialNodes} edges={initialEdges} nodeTypes={nodeTypes}>
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default FlowDiagram;