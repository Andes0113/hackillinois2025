"use client"

import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { EmailType } from "types";
import styles from "./EmailNode.module.css";

interface EmailNodeProps {
  email: EmailType;
  onClick: () => void;
}

type Props = NodeProps<EmailNodeProps>;

const EmailNode: React.FC<Props> = ({ data }) => {

  const handleClick = () => {
    data.onClick();
  };

  return (
    <div
      className={styles.emailNode}
      onClick={handleClick}
    >
      <p className={styles.emailText}>
        To: {data.email?.to} <br />
        From: {data.email?.from} <br />
        Subject: {data.email?.subject}
      </p>

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

export default EmailNode;
