import type { NextConfig } from 'next';

const appBuildId =
  process.env.DEPLOY_ID || process.env.COMMIT_REF || 'development';

const nextConfig: NextConfig = {
  generateBuildId: async () => appBuildId,
  env: {
    NEXT_PUBLIC_APP_BUILD_ID: appBuildId
  }
};

export default nextConfig;
