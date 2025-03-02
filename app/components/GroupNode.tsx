'use client';

import { Group } from 'app/contexts/EmailContext';
import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface GroupNodeProps {
  group: Group;
  selectedGroupId: number | null;
  editGroupName: (groupId: number, name: string) => Promise<void>;
}

type Props = NodeProps<GroupNodeProps>;

const GroupNode: React.FC<Props> = ({ data }) => {
  const [editing, setEditing] = useState<boolean>(false);
  const [name, setName] = useState(data.group.name!);

  function cancel() {
    setEditing(false);
    setName(data.group.name);
  }

  async function confirm() {
    await data.editGroupName(data.group.group_id, name);
    setEditing(false);
  }

  console.log(editing);
  return (
    <div
      className="w-64"
      style={{
        padding: 10,
        border: '1px solid black',
        borderRadius: 5,
        background: '#f9f9f9',
        cursor: 'pointer'
      }}
    >
      <div className="flex justify-between py-2 px-1 items-center">
        {editing ? (
          <input value={name} onChange={(e) => setName(e.target.value)} />
        ) : (
          <p>{name}</p>
        )}
        <div>
          {/* Bottom Handles */}
          <Handle
            type="target"
            position={Position.Bottom}
            id="bottom-target"
            style={{ visibility: 'hidden' }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="bottom-source"
            style={{ visibility: 'hidden' }}
          />

          {/* Top Handles */}
          <Handle
            type="target"
            position={Position.Top}
            id="top-target"
            style={{ visibility: 'hidden' }}
          />
          <Handle
            type="source"
            position={Position.Top}
            id="top-source"
            style={{ visibility: 'hidden' }}
          />

          {/* Left Handles */}
          <Handle
            type="target"
            position={Position.Left}
            id="left-target"
            style={{ visibility: 'hidden' }}
          />
          <Handle
            type="source"
            position={Position.Left}
            id="left-source"
            style={{ visibility: 'hidden' }}
          />

          {/* Right Handles */}
          <Handle
            type="target"
            position={Position.Right}
            id="right-target"
            style={{ visibility: 'hidden' }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="right-source"
            style={{ visibility: 'hidden' }}
          />
        </div>
        {editing ? (
          <div className="flex">
            <button className="border p-1" onClick={confirm}>
              Confirm
            </button>
            <button className="border p-1" onClick={cancel}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="border p-1" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
      </div>
    </div>
  );
};

export default GroupNode;
