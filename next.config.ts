
import type {NextConfig} from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

const nextConfig = (phase: string): NextConfig => {
  return {
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
    reactStrictMode: false,
    typescript: {
      ignoreBuildErrors: true,
    },
    eslint: {
      ignoreDuringBuilds: true,
    },
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'picsum.photos',
          port: '',
          pathname: '/**',
        },
        {
          protocol: 'https',
          hostname: 'placehold.co',
          port: '',
          pathname: '/**',
        }
      ],
    },
  };
};

export default nextConfig;
