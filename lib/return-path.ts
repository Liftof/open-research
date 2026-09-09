export function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith('/') || value.startsWith('//')) return '/account';
  const url = new URL(value, 'https://local.invalid');
  if (
    url.origin !== 'https://local.invalid' ||
    /^\/(sign-in|sign-up|login)(\/|$)/.test(url.pathname)
  )
    return '/account';
  return `${url.pathname}${url.search}${url.hash}`;
}
