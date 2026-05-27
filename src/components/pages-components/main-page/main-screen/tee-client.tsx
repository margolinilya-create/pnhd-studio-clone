'use client';

import dynamic from 'next/dynamic';
import TeePlaceholder from '@/components/shared-components/3d-tee/tee-placeholder';

const Tee = dynamic(() => import('@/components/shared-components/3d-tee/3d-tee'), {
  ssr: false,
  loading: () => <TeePlaceholder />,
});

export default function TeeClient({ backdropStatus, fov }: { backdropStatus: boolean; fov: number }) {
  return <Tee backdropStatus={backdropStatus} fov={fov} />;
}
