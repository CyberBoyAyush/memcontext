import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "apimemcontext.loclx.io",
    "dashmemcontext.loclx.io",
    "memcontext.loclx.io",
  ],
  // Allow external images from OAuth providers
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/mcp/claude", destination: "/mcp/oauth", permanent: false },
      { source: "/mcp/cli", destination: "/mcp/api-key", permanent: false },
    ];
  },
  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
