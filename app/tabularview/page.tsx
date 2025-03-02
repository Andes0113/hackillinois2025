'use client';
import { useEmailContext } from 'app/contexts/EmailContext'
import React from 'react'

const tabularview = () => {
  const { groups } = useEmailContext();
  console.log('groups', groups);
  return (
    <div>tabularview</div>
  )
}

export default tabularview