import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow phones/other devices on the LAN to load dev JS chunks (dev only).
  allowedDevOrigins: ["192.168.1.189", "192.168.*.*", "10.*.*.*"],
  transpilePackages: [
    "@fullcalendar/core",
    "@fullcalendar/react",
    "@fullcalendar/daygrid",
    "@fullcalendar/timegrid",
    "@fullcalendar/interaction",
    "three",
    "@react-three/fiber",
    "@react-three/drei",
  ],
  experimental: {
    optimizePackageImports: ["@react-three/drei", "date-fns", "@fullcalendar/react"],
  },
};

export default nextConfig;
