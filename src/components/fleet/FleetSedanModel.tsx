"use client";

import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import type { FleetCarSpecs } from "@/lib/fleet/car-info";
import * as THREE from "three";

type Variant = FleetCarSpecs["viewerVariant"];

type Props = Pick<FleetCarSpecs, "paintHex" | "viewerVariant">;

/** Procedural executive sedan — tuned separately for red vs black fleet cars. */
export function FleetSedanModel({ paintHex, viewerVariant }: Props) {
  const body = useMemo(() => new THREE.Color(paintHex), [paintHex]);

  const trim = useMemo(() => {
    if (viewerVariant === "black") return new THREE.Color("#b8c2ce");
    return new THREE.Color("#1a1f28");
  }, [viewerVariant]);

  const clearcoat = viewerVariant === "black" ? { metalness: 0.72, roughness: 0.18 } : { metalness: 0.52, roughness: 0.28 };
  const accent = viewerVariant === "red" ? new THREE.Color("#6b0f0f") : new THREE.Color("#0d0d10");

  const glassProps = useMemo(
    () => ({
      color: "#081018",
      transparent: true,
      opacity: 0.22,
      metalness: 1,
      roughness: 0.04,
      transmission: 0.92,
      thickness: 0.45,
      envMapIntensity: 1.35,
    }),
    [],
  );

  const headEmissive = viewerVariant === "red" ? "#fff4e0" : "#f8fbff";

  return (
    <group dispose={null}>
      {/* —— Lower chassis & rockers —— */}
      <RoundedBox
        args={[1.98, 0.36, 4.12]}
        radius={0.065}
        smoothness={6}
        castShadow
        receiveShadow
        position={[0, 0.52, -0.015]}
      >
        <meshPhysicalMaterial
          color={body}
          {...clearcoat}
          clearcoat={viewerVariant === "black" ? 0.85 : 0.62}
          clearcoatRoughness={viewerVariant === "black" ? 0.12 : 0.22}
          envMapIntensity={1.15}
        />
      </RoundedBox>

      {/* Cabin / greenhouse */}
      <RoundedBox
        args={[1.55, 0.58, 1.38]}
        radius={0.1}
        smoothness={6}
        castShadow
        receiveShadow
        position={[0, 1.13, -0.16]}
      >
        <meshPhysicalMaterial
          color={body}
          {...clearcoat}
          clearcoat={0.55}
          clearcoatRoughness={0.2}
          envMapIntensity={1.05}
        />
      </RoundedBox>

      {/* Roof (slightly narrower) */}
      <RoundedBox
        args={[1.35, 0.12, 1.12]}
        radius={0.045}
        smoothness={5}
        castShadow
        receiveShadow
        position={[0, 1.48, -0.2]}
      >
        <meshPhysicalMaterial
          color={body}
          {...clearcoat}
          clearcoat={0.7}
          clearcoatRoughness={0.14}
          envMapIntensity={1.25}
        />
      </RoundedBox>

      {/* Hood */}
      <RoundedBox
        args={[1.82, 0.32, 1.38]}
        radius={0.085}
        smoothness={6}
        castShadow
        receiveShadow
        position={[0, 0.73, 1.24]}
        rotation={[-0.11, 0, 0]}
      >
        <meshPhysicalMaterial color={body} {...clearcoat} clearcoat={0.68} clearcoatRoughness={0.16} envMapIntensity={1.2} />
      </RoundedBox>

      {/* Trunk deck */}
      <RoundedBox
        args={[1.78, 0.28, 0.92]}
        radius={0.065}
        smoothness={5}
        castShadow
        receiveShadow
        position={[0, 0.71, -1.24]}
        rotation={[0.05, 0, 0]}
      >
        <meshPhysicalMaterial color={body} {...clearcoat} clearcoat={0.55} clearcoatRoughness={0.2} envMapIntensity={1} />
      </RoundedBox>

      {/* Front bumper lip */}
      <RoundedBox
        args={[1.86, 0.16, 0.36]}
        radius={0.045}
        smoothness={5}
        castShadow
        receiveShadow
        position={[0, 0.35, 2.02]}
        rotation={[-0.12, 0, 0]}
      >
        <meshStandardMaterial color={accent} metalness={0.15} roughness={0.75} />
      </RoundedBox>

      {/* Grille frame */}
      <mesh position={[0, 0.62, 2.01]} castShadow>
        <boxGeometry args={[1.62, 0.34, 0.12]} />
        <meshStandardMaterial color="#0a0a0c" metalness={0.35} roughness={0.45} envMapIntensity={0.85} />
      </mesh>

      {/* Grille slats */}
      {[0.18, 0.06, -0.06, -0.18].map((y) => (
        <mesh key={y} position={[0, 0.55 + y, 2.05]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.03, 0.04]} />
          <meshStandardMaterial color="#111116" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}

      {viewerVariant === "black" ? (
        <mesh position={[0, 0.64, 2.065]} castShadow>
          <boxGeometry args={[1.68, 0.38, 0.035]} />
          <meshPhysicalMaterial color={trim} metalness={1} roughness={0.18} envMapIntensity={1.4} />
        </mesh>
      ) : null}

      {/* Headlamps */}
      <mesh position={[-0.58, 0.72, 1.98]} castShadow rotation={[0, 0, 0]}>
        <boxGeometry args={[0.42, 0.16, 0.08]} />
        <meshPhysicalMaterial
          color="#fffef5"
          emissive="#fffbf0"
          emissiveIntensity={viewerVariant === "red" ? 1.8 : 1.55}
          metalness={0.2}
          roughness={0.15}
        />
      </mesh>
      <mesh position={[0.58, 0.72, 1.98]} castShadow>
        <boxGeometry args={[0.42, 0.16, 0.08]} />
        <meshPhysicalMaterial
          color="#fffef5"
          emissive={headEmissive}
          emissiveIntensity={viewerVariant === "red" ? 1.85 : 1.6}
          metalness={0.2}
          roughness={0.15}
        />
      </mesh>

      {/* DRL stripe */}
      <mesh position={[0, 0.58, 1.99]} castShadow>
        <boxGeometry args={[1.45, 0.03, 0.035]} />
        <meshPhysicalMaterial
          color="#ffeed0"
          emissive="#ffc978"
          emissiveIntensity={0.95}
          metalness={0.1}
          roughness={0.25}
        />
      </mesh>

      {/* Rear lamp clusters */}
      {[-1, 1].map((sx) => (
        <RoundedBox
          key={sx}
          args={[0.32, 0.18, 0.055]}
          radius={0.02}
          smoothness={3}
          castShadow
          position={[sx * 0.75, 0.78, -2.015]}
          rotation={[0.08, sx * -0.12, 0]}
        >
          <meshPhysicalMaterial
            color="#5c0f0f"
            emissive="#d42828"
            emissiveIntensity={1.05}
            metalness={0.4}
            roughness={0.35}
          />
        </RoundedBox>
      ))}

      {/* Side mirrors */}
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * 0.87, 1.06, -0.05]} rotation={[0, 0, sx * -0.05]}>
          <mesh castShadow position={[sx * 0.11, 0, 0.02]}>
            <boxGeometry args={[0.1, 0.08, 0.06]} />
            <meshPhysicalMaterial color={body} {...clearcoat} clearcoat={0.5} clearcoatRoughness={0.28} envMapIntensity={1} />
          </mesh>
          <mesh castShadow rotation={[sx * 0.2, sx * -0.4, 0]} position={[sx * 0.18, -0.01, -0.01]}>
            <boxGeometry args={[0.12, 0.09, 0.05]} />
            <meshPhysicalMaterial {...glassProps} />
          </mesh>
        </group>
      ))}

      {/* Windshield wedge */}
      <mesh position={[0, 1.24, 0.58]} rotation={[-0.28, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.48, 0.02, 0.92]} />
        <meshPhysicalMaterial {...glassProps} />
      </mesh>

      {/* Side windows band */}
      <mesh position={[0, 1.18, -0.06]} rotation={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.62, 0.34, 0.015]} />
        <meshPhysicalMaterial {...glassProps} />
      </mesh>

      {/* Door cut line */}
      <mesh position={[-1.015, 0.85, -0.1]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[1.82, 0.004, 0.024]} />
        <meshStandardMaterial color="#000000" metalness={0.2} roughness={0.6} opacity={0.35} transparent />
      </mesh>
      <mesh position={[1.015, 0.85, -0.1]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[1.82, 0.004, 0.024]} />
        <meshStandardMaterial color="#000000" metalness={0.2} roughness={0.6} opacity={0.35} transparent />
      </mesh>

      {/* Wheels */}
      <WheelAssembly
        px={0.965}
        pz={1.06}
        variant={viewerVariant}
        rimDark={accent}
        caliberRed={viewerVariant === "red"}
      />
      <WheelAssembly px={-0.965} pz={1.06} variant={viewerVariant} rimDark={accent} caliberRed={viewerVariant === "red"} />
      <WheelAssembly px={0.965} pz={-1} variant={viewerVariant} rimDark={accent} caliberRed={viewerVariant === "red"} />
      <WheelAssembly px={-0.965} pz={-1} variant={viewerVariant} rimDark={accent} caliberRed={viewerVariant === "red"} />

      {/* Subtle diffuser */}
      <mesh position={[0, 0.32, -2]} castShadow rotation={[0.12, 0, 0]}>
        <boxGeometry args={[1.74, 0.12, 0.08]} />
        <meshStandardMaterial color="#08080b" metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Body side chrome / trim (both, stronger on black) */}
      {[0.32, -0.45].map((z) => (
        <mesh key={z} position={[-1.003, 0.68, z]} castShadow>
          <boxGeometry args={[0.012, 0.05, 0.65]} />
          <meshPhysicalMaterial
            color={viewerVariant === "black" ? "#d4dce6" : "#2f3540"}
            metalness={viewerVariant === "black" ? 0.95 : 0.65}
            roughness={viewerVariant === "black" ? 0.15 : 0.35}
            envMapIntensity={viewerVariant === "black" ? 1.5 : 0.95}
          />
        </mesh>
      ))}
      {[0.32, -0.45].map((z) => (
        <mesh key={`r-${z}`} position={[1.003, 0.68, z]} castShadow>
          <boxGeometry args={[0.012, 0.05, 0.65]} />
          <meshPhysicalMaterial
            color={viewerVariant === "black" ? "#d4dce6" : "#2f3540"}
            metalness={viewerVariant === "black" ? 0.95 : 0.65}
            roughness={viewerVariant === "black" ? 0.15 : 0.35}
            envMapIntensity={viewerVariant === "black" ? 1.5 : 0.95}
          />
        </mesh>
      ))}
    </group>
  );
}

function WheelAssembly({
  px,
  pz,
  variant,
  rimDark,
  caliberRed,
}: {
  px: number;
  pz: number;
  variant: Variant;
  rimDark: THREE.Color;
  caliberRed?: boolean;
}) {
  const y = 0.36;
  const spokeColor = variant === "black" ? new THREE.Color("#2a3038") : new THREE.Color("#1c2128");
  return (
    <group position={[px, y, pz]}>
      <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.34, 0.34, 0.26, 24]} />
        <meshStandardMaterial color="#121214" metalness={0.05} roughness={0.92} />
      </mesh>
      <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.28, 20]} />
        <meshPhysicalMaterial color={spokeColor} metalness={0.75} roughness={0.28} envMapIntensity={1.1} />
      </mesh>
      {variant === "black" ? (
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.205, 0.205, 0.291, 20]} />
          <meshPhysicalMaterial color="#b4bcc6" metalness={0.88} roughness={0.14} envMapIntensity={1.25} />
        </mesh>
      ) : null}
      {caliberRed ? (
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.16, 0.16, 0.32, 16]} />
          <meshStandardMaterial color="#b01010" metalness={0.6} roughness={0.35} />
        </mesh>
      ) : null}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.34, 0.34, 0.04, 24]} />
        <meshPhysicalMaterial color={rimDark} metalness={0.9} roughness={0.24} envMapIntensity={1} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.11, 0.11, 0.33, 12]} />
        <meshPhysicalMaterial color="#0b0c0e" metalness={0.45} roughness={0.55} />
      </mesh>
    </group>
  );
}
