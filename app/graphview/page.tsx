'use client';

import EmailSidebar from 'app/components/EmailSidebar';
import FlowCanvas from '../components/FlowCanvas';
import { useState } from 'react';
import { useEmailContext } from 'app/contexts/EmailContext';

export default function graphview() {
  const { groups, groupsLoading, selectedGroupId, setSelectedGroupId } =
    useEmailContext();
  const [daysAgo, setDaysAgo] = useState(30);

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    console.log(event.target.value);
    setDaysAgo(Number(event.target.value));
  };

  return (
    <>
      <select
        className="absolute top-20 right-5 bg-white border border-gray-300 rounded p-2 shadow-md"
        style={{ zIndex: 10 }}
        value={daysAgo}
        onChange={handleSelectChange}
      >
        <option value={30}>1 month</option>
        <option value={90}>3 months</option>
        <option value={180}>6 months</option>
        <option value={365}>1 year</option>
        <option value={1825}>5 years</option>
        <option value={9999}>All time</option>
      </select>
      <div className="flex">
        <EmailSidebar />
        {!groupsLoading && (
          <FlowCanvas
            groups={groups}
            selectedGroupId={selectedGroupId}
            setSelectedGroupId={setSelectedGroupId}
          />
        )}
      </div>
    </>
  );
}
