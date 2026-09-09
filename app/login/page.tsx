import { redirect } from 'next/navigation';
import { safeRelativeReturnPath } from '@/lib/return-path';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  redirect(
    '/sign-in?redirect_url=' +
      encodeURIComponent(safeRelativeReturnPath(returnTo || '/account')),
  );
}
