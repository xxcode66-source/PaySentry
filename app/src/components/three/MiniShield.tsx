"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/** Shield outline extruded into a glass slab (same shape as the hero shield). */
function useShieldGeometry() {
  return useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.55, 0.5);
    s.lineTo(0.55, 0.5);
    s.bezierCurveTo(0.55, -0.05, 0.42, -0.42, 0, -0.68);
    s.bezierCurveTo(-0.42, -0.42, -0.55, -0.05, -0.55, 0.5);
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
      curveSegments: 24,
    });
    g.center();
    return g;
  }, []);
}

/** Glass shield + green check, gently swaying and bobbing on its own. */
function Shield() {
  const group = useRef<THREE.Group>(null);
  const geo = useShieldGeometry();

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (!group.current) return;
    group.current.rotation.y = Math.sin(t * 0.5) * 0.45;
    group.current.rotation.x = Math.sin(t * 0.35) * 0.1;
    group.current.position.y = Math.sin(t * 0.9) * 0.06;
  });

  return (
    <group ref={group}>
      <mesh geometry={geo}>
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <mesh geometry={geo}>
        <meshBasicMaterial color="#67e8f9" wireframe transparent opacity={0.6} />
      </mesh>
      {/* Check mark: short arm down-right, long arm up-right */}
      <mesh position={[-0.135, -0.06, 0.12]} rotation={[0, 0, -0.75]}>
        <boxGeometry args={[0.22, 0.055, 0.03]} />
        <meshBasicMaterial color="#34d399" />
      </mesh>
      <mesh position={[0.095, 0.01, 0.12]} rotation={[0, 0, 0.8]}>
        <boxGeometry args={[0.42, 0.055, 0.03]} />
        <meshBasicMaterial color="#34d399" />
      </mesh>
    </group>
  );
}

/** Tiny self-animating 3D shield — used as the identity-card avatar instead
 *  of a letter initial. Fills its parent box. */
export function MiniShield({ dimmed = false }: { dimmed?: boolean }) {
  return (
    <div className={`h-full w-full ${dimmed ? "opacity-45" : ""}`} aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 3.1], fov: 40 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
        style={{ width: "100%", height: "100%" }}
      >
        <Shield />
      </Canvas>
    </div>
  );
}
