import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // YouTube
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'yt3.ggpht.com' },
      { protocol: 'https', hostname: 'yt3.googleusercontent.com' },
      // Instagram
      { protocol: 'https', hostname: 'scontent.cdninstagram.com' },
      { protocol: 'https', hostname: '*.cdninstagram.com' },
      { protocol: 'https', hostname: 'instagram.com' },
      { protocol: 'https', hostname: '*.fna.fbcdn.net' },
      // Telegram
      { protocol: 'https', hostname: 'telegram.org' },
      { protocol: 'https', hostname: '*.telegram.org' },
      { protocol: 'https', hostname: '*.telesco.pe' },
      // Spotify
      { protocol: 'https', hostname: '*.scdn.co' },
      { protocol: 'https', hostname: '*.spotifycdn.com' },
      { protocol: 'https', hostname: 'd3t3ozftmdmh3i.cloudfront.net' },
      // X/Twitter
      { protocol: 'https', hostname: 'pbs.twimg.com' },
      { protocol: 'https', hostname: 'abs.twimg.com' },
      // Facebook (multiple subdomain levels)
      { protocol: 'https', hostname: 'scontent.*.fna.fbcdn.net' },
      { protocol: 'https', hostname: 'scontent-*.xx.fbcdn.net' },
      { protocol: 'https', hostname: '*.fbcdn.net' },
      // Zehut logo
      { protocol: 'https', hostname: 'en.idi.org.il' },
    ],
  },
};

export default nextConfig;
