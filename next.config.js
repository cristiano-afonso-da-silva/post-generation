/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [{ source: '/landing', destination: '/agency', permanent: true }]
  },
  // For Next.js 13+ App Router, set body size limit for server actions
  // This allows base64 image data to be sent in API requests (20MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
}

export default nextConfig

