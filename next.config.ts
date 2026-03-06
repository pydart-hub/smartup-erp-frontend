import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow dev-server access from LAN IPs so client-side JS bundles,
  // HMR websocket, and fetch calls work correctly across the local network.
  allowedDevOrigins: [
    "192.168.1.66",
    "10.227.158.112",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
