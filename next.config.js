/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "store.playstation.com" },
      { protocol: "https", hostname: "image.api.playstation.com" },
      { protocol: "https", hostname: "**.sonyentertainmentnetwork.com" },
    ],
  },
};

module.exports = nextConfig;
