import type { ReactNode } from 'react';

export default function HomeStatus({ tone, children }: {
  tone: 'neutral' | 'positive' | 'pending' | 'notice' | 'error';
  children: ReactNode;
}) {
  return <span className="home-status" data-tone={tone} role="status">{children}</span>;
}
