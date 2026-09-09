import { ResearchApp } from './research-app';
import { listPapers } from '@/db/store';
export const dynamic = 'force-dynamic';
export default async function Home() {
  return <ResearchApp initialPapers={await listPapers()} />;
}
