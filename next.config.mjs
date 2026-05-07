/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '7360df1cc320f1db4cd8fc79d1a04bb4.r2.cloudflarestorage.com',
        pathname: '/proxidex/**',
      },
    ],
  },
}

export default nextConfig
