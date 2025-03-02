"use client"

import { Group } from "app/contexts/EmailContext";
import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import styles from "./GroupNode.module.css";

interface GroupNodeProps {
  group: Group;
  selectedGroupId: number | null;
}

type Props = NodeProps<GroupNodeProps>;

const GroupNode: React.FC<Props> = ({ data }) => {
  return (
    <div className={`max-w-xs ${styles.groupNode}`}>
      <p>{data.group?.name}</p>

      {/* Bottom Handles */}
      <Handle type="target" position={Position.Bottom} id="bottom-target" style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Bottom} id="bottom-source" style={{ visibility: 'hidden' }} />

      {/* Top Handles */}
      <Handle type="target" position={Position.Top} id="top-target" style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Top} id="top-source" style={{ visibility: 'hidden' }} />

      {/* Left Handles */}
      <Handle type="target" position={Position.Left} id="left-target" style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Left} id="left-source" style={{ visibility: 'hidden' }} />

      {/* Right Handles */}
      <Handle type="target" position={Position.Right} id="right-target" style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Right} id="right-source" style={{ visibility: 'hidden' }} />
    </div>
  );
};

export default GroupNode;
