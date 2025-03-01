import { useState } from "react";
import { NodeProps, Node, Handle, Position } from "@xyflow/react";

export type EmailNodeData = {
  to: string;
  from: string;
  subject: string;
  body: string;
  date: string;
  attachments: string[];
  labels: string[];
};

export type EmailNode = Node<EmailNodeData, 'email'>;

export default function EmailNode(props: NodeProps<EmailNode>) {
  return (
    <>
      <div style={{ border: "2px solid #000", borderRadius: "10px", padding: "10px", backgroundColor: "#f0f0f0" }}>
        <p>To: {props.data?.to}</p>
        <p>From: {props.data?.from}</p>
        <p>Body: {props.data?.body}</p>
      </div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </>
  )
};
