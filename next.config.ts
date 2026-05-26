import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
