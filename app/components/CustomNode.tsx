"use client"

import React from "react";
import { Handle, Position, NodeProps } from "reactflow";

const CustomNode: React.FC<NodeProps> = ({ data }) => {
  const handleClick = () => {
    alert(`Node clicked: ${data.label}`);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        padding: 10,
        border: "1px solid black",
        borderRadius: 5,
        background: "#f9f9f9",
        cursor: "pointer",
      }}
    >
      <strong>{data.label}</strong>

      {/* Input Handle */}
      <Handle type="target" position={Position.Left} style={{ background: "red" }} />

      {/* Output Handle */}
      <Handle type="source" position={Position.Right} style={{ background: "green" }} />
    </div>
  );
};

export default CustomNode;
