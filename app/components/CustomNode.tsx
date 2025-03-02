"use client"

import React from "react";
import { Handle, Position, NodeProps } from "reactflow";

interface CustomNodeProps {
  sender: string;
  receiver: string;
  dateSent: string;
  subject?: string;
  message?: string;
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
      <p>To: {data.receiver}</p>
      <p>From: {data.sender}</p>
      <p>Subject: {data.subject}</p>

      {/* Top Handles */}
      <Handle type="target" position={Position.Top} id="top-target" style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Top} id="top-source" style={{ visibility: 'hidden' }} />

      {/* Left Handles */}
      <Handle type="target" position={Position.Left} id="left-target" style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Left} id="left-source" style={{ visibility: 'hidden' }} />

      {/* Right Handles */}
      <Handle type="target" position={Position.Right} id="right-target" style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Right} id="right-source" style={{ visibility: 'hidden' }} />

      {/* Bottom Handles */}
      <Handle type="target" position={Position.Bottom} id="bottom-target" style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Bottom} id="bottom-source" style={{ visibility: 'hidden' }} />
    </div>
  );
};

export default CustomNode;
