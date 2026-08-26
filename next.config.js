const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js needs 'unsafe-eval'/'unsafe-inline' for dev refresh and hydration scripts without a nonce setup.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://*.googleusercontent.com https://firebasestorage.googleapis.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.googleapis.com https://firebasestorage.googleapis.com",
  "frame-src https://*.firebaseapp.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
