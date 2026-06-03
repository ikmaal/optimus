"use client";

import { useGLTF } from "@react-three/drei";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";

export const BLACK_CAR_MODEL_URL = "/models/black-car.glb";
export const RED_CAR_MODEL_URL = "/models/red-car.glb";

useGLTF.preload(BLACK_CAR_MODEL_URL);
useGLTF.preload(RED_CAR_MODEL_URL);

type Props = {
  url: string;
  /** Optional Y rotation in radians (Meshy exports often need ~90°). */
  rotationY?: number;
};

export function FleetGlbModel({ url, rotationY = 0 }: Props) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => scene.clone(true), [scene]);

  useLayoutEffect(() => {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of mats) {
          if (mat && "envMapIntensity" in mat) {
            (mat as THREE.MeshStandardMaterial).envMapIntensity = 1.1;
          }
        }
      }
    });
  }, [model]);

  return <primitive object={model} rotation={[0, rotationY, 0]} />;
}
