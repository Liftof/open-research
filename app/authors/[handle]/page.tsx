import { AuthorPage } from './profile';
import { findAuthor } from '@/db/accounts';
import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const author = await findAuthor(handle);
  return { title: author?.name || 'Author' };
}
export default async function Page({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  if (!(await findAuthor(handle))) notFound();
  return <AuthorPage handle={handle} />;
}
