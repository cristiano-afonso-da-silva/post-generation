/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Increase body size limit to handle large image uploads (20MB)
  // This allows base64 image data to be sent in API requests
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
  // For Next.js 13+ App Router, we also need to set this
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
}

export default nextConfig

