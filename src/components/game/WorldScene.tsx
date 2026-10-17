import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, Environment, Lightformer } from "@react-three/drei";
import { useRef, useState } from "react";
import type * as THREE from "three";
import type { SceneId, Character, RoomStyle } from "@/game/state";

export interface District { id: string; name: string; x: number; z: number; w: number; d: number; h: number; color: string; locked: boolean }

function Building({ b, onSelect, selected }: { b: District; onSelect: (id: string) => void; selected: boolean }) {
  const [hover, setHover] = useState(false);
  const color = b.locked ? "#c9c2b6" : b.color;
  return (
    <group position={[b.x, 0, b.z]}>
      <mesh position={[0, b.h / 2, 0]} castShadow receiveShadow
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); }} onPointerOut={() => setHover(false)}
        onClick={(e) => { e.stopPropagation(); onSelect(b.id); }}>
        <boxGeometry args={[b.w, b.h, b.d]} />
        <meshStandardMaterial color={color} emissive={selected || hover ? "#bd694a" : "#000"} emissiveIntensity={selected ? 0.35 : hover ? 0.18 : 0} roughness={0.8} />
      </mesh>
      <mesh position={[0, b.h + 0.4, 0]} castShadow>
        <coneGeometry args={[Math.min(b.w, b.d) * 0.6, 0.8, 4]} />
        <meshStandardMaterial color="#27221f" roughness={0.6} />
      </mesh>
      {Array.from({ length: Math.floor(b.h / 1.6) }).map((_, i) => (
        <mesh key={i} position={[0, 1 + i * 1.6, b.d / 2 + 0.01]}>
          <planeGeometry args={[b.w * 0.7, 0.5]} />
          <meshStandardMaterial color="#e9eef0" emissive="#9cc7c4" emissiveIntensity={0.25} />
        </mesh>
      ))}
      {(hover || selected) && (
        <Html position={[0, b.h + 1.6, 0]} center distanceFactor={22}>
          <div className="whitespace-nowrap rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background shadow-lg">
            {b.name}{b.locked ? " · locked" : ""}
          </div>
        </Html>
      )}
    </group>
  );
}

function Tree({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.15, 0.2, 1]} /><meshStandardMaterial color="#7a5a43" /></mesh>
      <mesh position={[0, 1.5, 0]} castShadow><icosahedronGeometry args={[0.9, 0]} /><meshStandardMaterial color="#6f9a7a" flatShading /></mesh>
    </group>
  );
}

function Car({ z, speed }: { z: number; speed: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((st) => { if (ref.current) ref.current.position.x = ((st.clock.elapsedTime * speed) % 60) - 30; });
  return <mesh ref={ref} position={[0, 0.4, z]} castShadow><boxGeometry args={[1.6, 0.6, 0.9]} /><meshStandardMaterial color="#3e7f86" /></mesh>;
}

function Avatar({ c, pos }: { c: Character; pos: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((st) => { if (ref.current) ref.current.position.y = pos[1] + Math.sin(st.clock.elapsedTime * 2) * 0.05; });
  return (
    <group ref={ref} position={pos}>
      <mesh position={[0, 0.6, 0]} castShadow><capsuleGeometry args={[0.3, 0.6]} /><meshStandardMaterial color={c.outfit} /></mesh>
      <mesh position={[0, 1.35, 0]} castShadow><sphereGeometry args={[0.28, 16, 16]} /><meshStandardMaterial color={c.skin} /></mesh>
      <mesh position={[0, 1.5, -0.03]}><sphereGeometry args={[0.29, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={c.hair} /></mesh>
    </group>
  );
}

function City({ districts, onSelect, selected }: { districts: District[]; onSelect: (id: string) => void; selected: string | null }) {
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[80, 60]} /><meshStandardMaterial color="#d9cfbd" /></mesh>
      {[-8, 8].map((z) => <mesh key={z} rotation-x={-Math.PI / 2} position={[0, 0.02, z]} receiveShadow><planeGeometry args={[70, 3.4]} /><meshStandardMaterial color="#4a4440" /></mesh>)}
      {[-10.5, 10.5].map((x) => <mesh key={x} rotation-x={-Math.PI / 2} position={[x, 0.021, 0]} receiveShadow><planeGeometry args={[3.4, 50]} /><meshStandardMaterial color="#4a4440" /></mesh>)}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]} receiveShadow><planeGeometry args={[14, 10]} /><meshStandardMaterial color="#9bb88f" /></mesh>
      {[[-3, -2], [3, 2], [-4, 3], [4, -3], [0, 0], [-30, 0], [30, -8], [-14, 22], [14, -22]].map(([x, z], i) => <Tree key={i} x={x} z={z} />)}
      <Car z={-7.4} speed={6} /><Car z={8.6} speed={4.5} />
      {districts.map((b) => <Building key={b.id} b={b} onSelect={onSelect} selected={selected === b.id} />)}
    </>
  );
}

function Room({ r, c }: { r: RoomStyle; c: Character }) {
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[10, 10]} /><meshStandardMaterial color="#c9a582" /></mesh>
      <mesh position={[0, 2.5, -5]} receiveShadow><boxGeometry args={[10, 5, 0.2]} /><meshStandardMaterial color={r.wall} /></mesh>
      <mesh position={[-5, 2.5, 0]} receiveShadow><boxGeometry args={[0.2, 5, 10]} /><meshStandardMaterial color={r.wall} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0.5, 0.02, 0.5]}><circleGeometry args={[2.2, 32]} /><meshStandardMaterial color={r.rug} /></mesh>
      <mesh position={[-2.5, 0.75, -3.8]} castShadow><boxGeometry args={[3, 0.15, 1.4]} /><meshStandardMaterial color="#8a6a4f" /></mesh>
      <mesh position={[-2.5, 1.2, -4.1]} castShadow><boxGeometry args={[1.2, 0.8, 0.08]} /><meshStandardMaterial color="#27221f" emissive="#4c9589" emissiveIntensity={0.4} /></mesh>
      <mesh position={[3, 0.4, -3]} castShadow><boxGeometry args={[2.6, 0.6, 3.6]} /><meshStandardMaterial color="#e8dccb" /></mesh>
      {r.plant && <Tree x={3.8} z={2.8} />}
      {r.lamp && <><mesh position={[-4, 1.2, 2]}><cylinderGeometry args={[0.05, 0.05, 2.4]} /><meshStandardMaterial color="#27221f" /></mesh><pointLight position={[-4, 2.5, 2]} intensity={6} color="#ffd9a8" /><mesh position={[-4, 2.5, 2]}><sphereGeometry args={[0.3]} /><meshStandardMaterial emissive="#ffd9a8" emissiveIntensity={2} color="#fff" /></mesh></>}
      {r.shelf && <mesh position={[1.5, 2.5, -4.8]} castShadow><boxGeometry args={[2.5, 1.6, 0.4]} /><meshStandardMaterial color="#7a5a43" /></mesh>}
      <Avatar c={c} pos={[0.5, 0, 0.5]} />
    </>
  );
}

function Office({ c, staff, board }: { c: Character; staff: number; board: boolean }) {
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[16, 12]} /><meshStandardMaterial color={board ? "#3a332e" : "#d8cbb6"} /></mesh>
      <mesh position={[0, 3, -6]}><boxGeometry args={[16, 6, 0.2]} /><meshStandardMaterial color={board ? "#27221f" : "#f1ebe1"} /></mesh>
      {board ? (
        <><mesh position={[0, 0.8, 0]} castShadow><boxGeometry args={[7, 0.15, 2.6]} /><meshStandardMaterial color="#bd694a" roughness={0.3} /></mesh>
        <mesh position={[0, 3, -5.85]}><planeGeometry args={[6, 2.5]} /><meshStandardMaterial emissive="#4c9589" emissiveIntensity={0.6} color="#1d2a2b" /></mesh></>
      ) : Array.from({ length: 7 }).map((_, i) => {
        const x = -5 + (i % 4) * 3.4, z = -2 + Math.floor(i / 4) * 3.5, on = i < staff;
        return <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.75, 0]} castShadow><boxGeometry args={[2, 0.12, 1]} /><meshStandardMaterial color={on ? "#8a6a4f" : "#cfc5b5"} /></mesh>
          {on && <Avatar c={{ ...c, outfit: ["#4c9589", "#bd694a", "#5a7fa6", "#c9a35a"][i % 4], skin: "#c8956d" }} pos={[0, 0, 0.8]} />}
        </group>;
      })}
      <Avatar c={c} pos={board ? [0, 0, 2] : [5.5, 0, 3]} />
    </>
  );
}

export function WorldScene(props: { scene: SceneId; districts: District[]; selected: string | null; onSelect: (id: string) => void; character: Character; room: RoomStyle; staff: number; quality: "high" | "low" }) {
  const city = props.scene === "city";
  return (
    <Canvas shadows={props.quality === "high"} dpr={props.quality === "high" ? [1, 2] : 1} camera={{ position: city ? [26, 26, 30] : [9, 8, 11], fov: 45 }} key={props.scene}>
      <color attach="background" args={["#faf7f1"]} />
      <fog attach="fog" args={["#faf7f1", 50, 110]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[15, 25, 10]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={40} shadow-camera-bottom={-40} />
      <Environment resolution={64}><Lightformer intensity={1.5} position={[0, 6, 0]} scale={[10, 10, 1]} /><Lightformer intensity={0.8} color="#9cc7c4" position={[-6, 2, 0]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} /></Environment>
      {city && <City districts={props.districts} onSelect={props.onSelect} selected={props.selected} />}
      {props.scene === "room" && <Room r={props.room} c={props.character} />}
      {(props.scene === "office" || props.scene === "boardroom") && <Office c={props.character} staff={props.staff} board={props.scene === "boardroom"} />}
      <OrbitControls enablePan enableDamping maxPolarAngle={Math.PI / 2.3} minDistance={6} maxDistance={city ? 70 : 22} />
    </Canvas>
  );
}

export function hasWebGL() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}