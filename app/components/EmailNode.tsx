import { useState } from "react";
import { NodeProps, Node } from "@xyflow/react";

export type EmailNode = Node<
  {
    id: string;
    to: string;
    from: string;
    subject: string;
    body: string;
    date: string;
    attachments: string[];
    labels: string[];
  },
  'email'
>;

export default function EmailNode(props: NodeProps<EmailNode>) {
  return (
    <div>
      <p>To: {props.data?.to ?? "unknown"}</p>
      <p>From: {props.data?.from ?? "unknown"}</p>
      <p>Body: {props.data?.body ?? "unknown"}</p>
    </div>
  )
};
