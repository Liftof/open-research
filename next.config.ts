import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  serverExternalPackages: ['unpdf'],
  outputFileTracingIncludes: {
    '/api/papers/*/file': ['./public/papers/*.pdf'],
    '/api/papers/*/scan': ['./public/papers/*.pdf'],
  },
};
export default nextConfig;
