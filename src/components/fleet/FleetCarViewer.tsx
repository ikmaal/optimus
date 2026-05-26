"use client";

import { Canvas } from "@react-three/fiber";
import { Bounds, Center, Environment, OrbitControls } from "@react-three/drei";
import { Suspense } from "react";
import type { FleetCarSpecs } from "@/lib/fleet/car-info";
import { FleetSedanModel } from "@/components/fleet/FleetSedanModel";

type Props = {
  specs: FleetCarSpecs;
};

const VIEWER_HEIGHT = "min(56vh, 480px)";
const MODEL_SCALE = 1.35;

export function FleetCarViewer({ specs }: Props) {
  return (
    <div
      className="relative overflow-hidden rounded-[var(--radius-lg)] shadow-[var(--shadow-card)]"
      style={{
        border: "1px solid var(--border-subtle)",
        background: "var(--surface-muted)",
        height: VIEWER_HEIGHT,
        touchAction: "none",
      }}
    >
      <Canvas
        className="block h-full w-full"
        shadows
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
        camera={{ fov: 35, near: 0.05, far: 120, position: [4, 2.5, 4] }}
      >
        <Suspense fallback={null}>
          <Environment preset="studio" />
          <ambientLight intensity={0.38} />
          <directionalLight
            castShadow
            intensity={1.12}
            position={[6.5, 11, 5]}
            shadow-mapSize={[1536, 1536]}
            shadow-camera-left={-8}
            shadow-camera-right={8}
            shadow-camera-top={8}
            shadow-camera-bottom={-8}
          />
          <directionalLight intensity={0.45} position={[-5, 4, -3]} color="#c8d4ff" />
          <directionalLight intensity={0.22} position={[2, 1.5, 6]} color="#fff0e0" />

          <Bounds fit clip observe margin={1.18}>
            <Center top>
              <group scale={MODEL_SCALE}>
                <FleetSedanModel paintHex={specs.paintHex} viewerVariant={specs.viewerVariant} />
              </group>
            </Center>
          </Bounds>

          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
            <planeGeometry args={[20, 20]} />
            <shadowMaterial opacity={0.28} transparent />
          </mesh>

          <OrbitControls
            makeDefault
            enablePan={false}
            minDistance={0.5}
            maxDistance={20}
            minPolarAngle={0.35}
            maxPolarAngle={Math.PI / 2 - 0.08}
            enableDamping
            dampingFactor={0.06}
          />
        </Suspense>
      </Canvas>

      <p
        className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        Drag to orbit · Scroll to zoom
      </p>
    </div>
  );
}
