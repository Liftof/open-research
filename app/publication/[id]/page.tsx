import { siteOrigin } from '@/lib/site';
import { Publication } from '../../research-app';
import { getPaper } from '@/db/store';
import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const paper = await getPaper(id);
  if (!paper)
    return { title: 'Publication not found', robots: { index: false } };
  const url = `${siteOrigin}/publication/${id}`;
  return {
    title: paper.title,
    description: paper.abstract,
    alternates: { canonical: url },
    openGraph: {
      title: paper.title,
      description: paper.abstract,
      type: 'article',
      url,
    },
    other: {
      citation_title: paper.title,
      citation_author: paper.author,
      citation_publication_date:
        paper.publishedAt || paper.createdAt.slice(0, 10),
      citation_pdf_url: new URL(paper.pdfUrl, url).href,
    },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const paper = await getPaper(id);
  if (!paper) notFound();
  return <Publication id={id} initialPaper={paper} />;
}
