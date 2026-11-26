"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sparkles } from "@react-three/drei";
import { useRef } from "react";
import type { Mesh, Group } from "three";

function Orb() {
  const mesh = useRef<Mesh>(null);
  useFrame((state, dt) => {
    if (!mesh.current) return;
    mesh.current.rotation.y += dt * 0.15;
    mesh.current.rotation.x += dt * 0.05;
  });
  return (
    <Float speed={1.4} rotationIntensity={0.4} floatIntensity={1.2}>
      <mesh ref={mesh} scale={1.55}>
        <icosahedronGeometry args={[1, 24]} />
        <MeshDistortMaterial color="#8f6bff" emissive="#2a1a66" roughness={0.15} metalness={0.6} distort={0.42} speed={1.6} />
      </mesh>
    </Float>
  );
}

function Rings() {
  const g = useRef<Group>(null);
  useFrame((state) => {
    if (!g.current) return;
    // ikut gerak mouse sedikit (parallax)
    g.current.rotation.y += (state.pointer.x * 0.4 - g.current.rotation.y) * 0.05;
    g.current.rotation.x += (-state.pointer.y * 0.25 - g.current.rotation.x) * 0.05;
  });
  return (
    <group ref={g}>
      {[2.3, 2.9].map((r, i) => (
        <mesh key={r} rotation={[Math.PI / 2.3 + i * 0.5, i * 0.6, 0]}>
          <torusGeometry args={[r, 0.008, 16, 180]} />
          <meshBasicMaterial color={i ? "#5ee1ff" : "#b38cff"} transparent opacity={0.55} />
        </mesh>
      ))}
    </group>
  );
}

export default function Hero3D() {
  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 1.8]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} color="#ffffff" />
      <pointLight position={[-4, -2, 2]} intensity={30} color="#5ee1ff" />
      <pointLight position={[4, 2, -2]} intensity={25} color="#b38cff" />
      <Orb />
      <Rings />
      <Sparkles count={70} scale={[9, 6, 4]} size={2.2} speed={0.35} color="#d9c8ff" />
    </Canvas>
  );
}
