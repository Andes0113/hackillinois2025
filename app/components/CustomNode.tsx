"use client"

import React from "react";
import { Handle, Position, NodeProps } from "reactflow";

interface CustomNodeProps {
  to: string;
  from: string;
  body: string;
  date: string;
  attachments: string[];
  labels: string[];
  daysAgo: number;
  onClick: () => void;
}

type Props = NodeProps<CustomNodeProps>;

const CustomNode: React.FC<Props> = ({ data }) => {

  const handleClick = () => {
    data.onClick();
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
      <p>To: {data.to}</p>
      <p>From: {data.from}</p>
      <p>Body: {data.body}</p>

      {/* Input Handle */}
      <Handle type="target" position={Position.Top} style={{ background: "red" }} />

      {/* Output Handle */}
      <Handle type="source" position={Position.Bottom} style={{ background: "green" }} />
    </div>
  );
};

export default CustomNode;
