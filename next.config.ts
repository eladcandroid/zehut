import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // YouTube
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'yt3.ggpht.com' },
      { protocol: 'https', hostname: 'yt3.googleusercontent.com' },
      // TikTok
      { protocol: 'https', hostname: 'p16-sign-sg.tiktokcdn.com' },
      { protocol: 'https', hostname: 'p16-sign-va.tiktokcdn.com' },
      { protocol: 'https', hostname: '*.tiktokcdn.com' },
      // Instagram
      { protocol: 'https', hostname: 'scontent.cdninstagram.com' },
      { protocol: 'https', hostname: '*.cdninstagram.com' },
      { protocol: 'https', hostname: 'instagram.com' },
      // Telegram
      { protocol: 'https', hostname: 'telegram.org' },
      { protocol: 'https', hostname: '*.telegram.org' },
      // X/Twitter via Nitter
      { protocol: 'https', hostname: 'nitter.poast.org' },
      { protocol: 'https', hostname: 'nitter.privacydev.net' },
      { protocol: 'https', hostname: 'nitter.woodland.cafe' },
      { protocol: 'https', hostname: 'pbs.twimg.com' },
      { protocol: 'https', hostname: 'abs.twimg.com' },
      // Facebook
      { protocol: 'https', hostname: '*.fbcdn.net' },
      { protocol: 'https', hostname: '*.fna.fbcdn.net' },
      // Zehut logo
      { protocol: 'https', hostname: 'en.idi.org.il' },
    ],
  },
};

export default nextConfig;
