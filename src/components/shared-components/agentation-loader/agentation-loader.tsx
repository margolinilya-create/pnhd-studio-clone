'use client';

import dynamic from 'next/dynamic';

const Agentation =
  process.env.NODE_ENV !== 'production'
    ? dynamic(() => import('agentation').then((m) => m.Agentation), {
        ssr: false,
      })
    : () => null;

export default function AgentationLoader() {
  return <Agentation />;
}
