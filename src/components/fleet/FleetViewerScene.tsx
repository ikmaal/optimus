"use client";

import { Bounds, Center, Environment, OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import type { FleetCarSpecs } from "@/lib/fleet/car-info";
import type { CarOperationalStatus } from "@/lib/fleet/car-status";
import { FleetGlbModel } from "@/components/fleet/FleetGlbModel";
import { FleetSedanModel } from "@/components/fleet/FleetSedanModel";

const PROCEDURAL_SCALE = 1.35;

type Props = {
  specs: FleetCarSpecs;
  status: CarOperationalStatus;
};

function FleetCarModel({ specs }: { specs: FleetCarSpecs }) {
  if (specs.modelUrl) {
    return <FleetGlbModel url={specs.modelUrl} rotationY={specs.modelRotationY ?? 0} />;
  }
  return (
    <group scale={PROCEDURAL_SCALE}>
      <FleetSedanModel paintHex={specs.paintHex} viewerVariant={specs.viewerVariant} />
    </group>
  );
}

function useRoadTexture() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#2c3138";
    ctx.fillRect(0, 0, 128, 256);
    ctx.fillStyle = "#e8eaed";
    for (let y = 0; y < 256; y += 36) {
      ctx.fillRect(58, y, 12, 18);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 12);
    return tex;
  }, []);
}

function DrivingBackground() {
  const roadTex = useRoadTexture();
  const sideTex = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#3d5c34";
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    return tex;
  }, []);

  useFrame((_, delta) => {
    if (roadTex) roadTex.offset.y -= delta * 3.5;
  });

  return (
    <group>
      <color attach="background" args={["#87a8c4"]} />
      <fog attach="fog" args={["#9eb6c9", 12, 42]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[14, 50]} />
        <meshStandardMaterial map={roadTex ?? undefined} color="#3a3f46" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-9, -0.03, 0]}>
        <planeGeometry args={[8, 50]} />
        <meshStandardMaterial map={sideTex ?? undefined} color="#4a6b40" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[9, -0.03, 0]}>
        <planeGeometry args={[8, 50]} />
        <meshStandardMaterial map={sideTex ?? undefined} color="#4a6b40" roughness={1} />
      </mesh>
      <ambientLight intensity={0.55} color="#dce8f5" />
      <directionalLight intensity={1.1} position={[4, 12, 6]} color="#fff8ee" castShadow />
      <directionalLight intensity={0.35} position={[-6, 4, -2]} color="#b8d4ff" />
    </group>
  );
}

function GarageBackground() {
  return (
    <group>
      <color attach="background" args={["#1a1f28"]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#3d4450" roughness={0.85} metalness={0.08} />
      </mesh>
      <mesh position={[0, 3.2, -7.5]} receiveShadow>
        <planeGeometry args={[18, 6.5]} />
        <meshStandardMaterial color="#525a68" roughness={0.9} />
      </mesh>
      <mesh position={[-8.5, 3.2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[16, 6.5]} />
        <meshStandardMaterial color="#464d5a" roughness={0.92} />
      </mesh>
      <mesh position={[8.5, 3.2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[16, 6.5]} />
        <meshStandardMaterial color="#464d5a" roughness={0.92} />
      </mesh>
      {[-3, 0, 3].map((x) => (
        <mesh key={x} position={[x, 5.8, -2]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.2, 0.35]} />
          <meshStandardMaterial color="#fff4d6" emissive="#fff0c8" emissiveIntensity={1.8} />
        </mesh>
      ))}
      <ambientLight intensity={0.32} color="#c8d0e0" />
      <directionalLight intensity={0.95} position={[2, 9, 4]} color="#fff6e8" castShadow />
      <pointLight position={[0, 5.5, 2]} intensity={0.45} color="#ffe8b0" distance={14} />
    </group>
  );
}

function WorkshopBackground() {
  return (
    <group>
      <color attach="background" args={["#1c1814"]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#4a4540" roughness={0.95} />
      </mesh>
      <mesh position={[0, 3, -7]}>
        <planeGeometry args={[16, 6]} />
        <meshStandardMaterial color="#5c5348" roughness={0.88} />
      </mesh>
      {[-4, -1.5, 1, 3.5].map((x) => (
        <mesh key={x} position={[x, 1.8, -6.85]}>
          <boxGeometry args={[1.6, 3.2, 0.5]} />
          <meshStandardMaterial color="#6b6358" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[5.5, 0.55, -5.5]}>
        <boxGeometry args={[2.5, 1.1, 1.2]} />
        <meshStandardMaterial color="#8a4c2a" roughness={0.7} metalness={0.15} />
      </mesh>
      <mesh position={[-5, 2.2, -4]} rotation={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 3.5, 8]} />
        <meshStandardMaterial color="#888" metalness={0.6} roughness={0.35} />
      </mesh>
      <ambientLight intensity={0.38} color="#ffd8b0" />
      <directionalLight intensity={0.85} position={[3, 8, 5]} color="#ffe0c0" castShadow />
      <pointLight position={[-2, 4, 1]} intensity={0.55} color="#ff9a3c" distance={12} />
      <pointLight position={[4, 3, -2]} intensity={0.35} color="#ffffff" distance={10} />
    </group>
  );
}

function SceneBackground({ status }: { status: CarOperationalStatus }) {
  switch (status) {
    case "driving":
      return <DrivingBackground />;
    case "workshop":
      return <WorkshopBackground />;
    default:
      return <GarageBackground />;
  }
}

function environmentPreset(status: CarOperationalStatus): "warehouse" | "sunset" | "city" {
  switch (status) {
    case "driving":
      return "sunset";
    case "workshop":
      return "city";
    default:
      return "warehouse";
  }
}

export function FleetViewerScene({ specs, status }: Props) {
  return (
    <>
      <SceneBackground status={status} />
      {status === "parked" ? (
        <Environment preset="warehouse" />
      ) : (
        <Environment preset={environmentPreset(status)} environmentIntensity={0.3} />
      )}

      <Bounds fit clip observe margin={1.18}>
        <Center top>
          <FleetCarModel specs={specs} />
        </Center>
      </Bounds>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <shadowMaterial opacity={status === "driving" ? 0.18 : 0.28} transparent />
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
    </>
  );
}
