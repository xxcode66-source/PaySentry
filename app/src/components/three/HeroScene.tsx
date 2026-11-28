"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/** ~2600 particles on a jittered fibonacci sphere, cyan shading by height. */
function ParticleSphere() {
  const ref = useRef<THREE.Points>(null);
  const { positions, colors } = useMemo(() => {
    const N = 2600;
    const positions = new Float32Array(N * 3);
    const colors = new Float32Array(N * 3);
    const cyan = new THREE.Color("#22d3ee");
    const deep = new THREE.Color("#0e7490");
    const tmp = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const phi = Math.acos(1 - 2 * t);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 2.35 + (Math.random() - 0.5) * 0.55;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      tmp.lerpColors(cyan, deep, (y + 2.6) / 5.2);
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    return { positions, colors };
  }, []);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.055;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.021}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.65}
        depthWrite={false}
      />
    </points>
  );
}

/** Wireframe core + orbit ring with two sentinel orbs — the "shield watching payments" motif. */
function CoreGroup() {
  const core = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Group>(null);
  const orbA = useRef<THREE.Mesh>(null);
  const orbB = useRef<THREE.Mesh>(null);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    if (core.current) {
      core.current.rotation.y += delta * 0.18;
      core.current.rotation.x = Math.sin(t * 0.3) * 0.15;
    }
    if (inner.current) inner.current.rotation.y -= delta * 0.3;
    if (ring.current) ring.current.rotation.y = t * 0.22;
    if (orbA.current) orbA.current.position.set(Math.cos(t * 0.9) * 2.12, 0, Math.sin(t * 0.9) * 2.12);
    if (orbB.current) orbB.current.position.set(Math.cos(t * 0.9 + Math.PI) * 2.12, 0, Math.sin(t * 0.9 + Math.PI) * 2.12);
  });

  return (
    <group rotation={[0.42, 0, 0.1]}>
      <mesh ref={core}>
        <icosahedronGeometry args={[1.02, 1]} />
        <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.18} />
      </mesh>
      <mesh ref={inner}>
        <icosahedronGeometry args={[0.58, 0]} />
        <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.35} />
      </mesh>
      <group ref={ring} rotation={[1.25, 0, 0]}>
        <mesh>
          <torusGeometry args={[2.12, 0.005, 8, 180]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.22} />
        </mesh>
        <mesh ref={orbA}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshBasicMaterial color="#22d3ee" />
        </mesh>
        <mesh ref={orbB}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshBasicMaterial color="#67e8f9" />
        </mesh>
      </group>
    </group>
  );
}

/** Pointer parallax rig — shifted down and scaled so the globe sits below
 *  the headline (behind the CTAs/stats) instead of crossing the text. */
function Rig({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ pointer }) => {
    if (!group.current) return;
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, pointer.x * 0.22, 0.05);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, pointer.y * 0.16, 0.05);
  });
  return (
    <group ref={group} position={[0, -1.05, 0]} scale={0.82}>
      {children}
    </group>
  );
}

export function HeroScene() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 6.6], fov: 42 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Rig>
          <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.55}>
            <CoreGroup />
          </Float>
          <ParticleSphere />
        </Rig>
      </Canvas>
    </div>
  );
}
