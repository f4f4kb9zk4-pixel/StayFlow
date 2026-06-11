/** @type {import('next').NextConfig} */
const nextConfig = {
  // Run pdfjs-dist as a real Node module instead of a webpack bundle for
  // server actions, so its worker file (pdf.worker.mjs) resolves from
  // node_modules at runtime instead of a missing webpack vendor chunk.
  serverExternalPackages: ["pdfjs-dist"],
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;
