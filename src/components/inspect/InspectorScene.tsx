import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { damp } from "@/lib/motion";
import { machineComponents, type ComponentKey } from "@/data/machineComponents";

const ACCENT = "#836ef9";

export type InspectorProps = {
  explode: number;
  wireframe: boolean;
  hovered: ComponentKey | null;
  selected: ComponentKey | null;
  autoRotate: boolean;
  zoomEnabled: boolean;
  tier?: "high" | "reduced";
  onHover: (k: ComponentKey | null) => void;
  onSelect: (k: ComponentKey | null) => void;
  controlsRef?: React.MutableRefObject<OrbitControlsImpl | null>;
};

function Part({
  id,
  offset,
  explode,
  hovered,
  selected,
  wireframe,
  onHover,
  onSelect,
  children,
}: {
  id: ComponentKey;
  offset: [number, number, number];
  explode: number;
  hovered: ComponentKey | null;
  selected: ComponentKey | null;
  wireframe: boolean;
  onHover: (k: ComponentKey | null) => void;
  onSelect: (k: ComponentKey | null) => void;
  children: React.ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  const active = hovered === id || selected === id;
  const muted = selected !== null && selected !== id;

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    g.position.x = damp(g.position.x, offset[0] * explode * 0.8, 4, dt);
    g.position.y = damp(g.position.y, offset[1] * explode * 0.8, 4, dt);
    g.position.z = damp(g.position.z, offset[2] * explode * 0.8, 4, dt);
    g.scale.setScalar(damp(g.scale.x, active ? 1.03 : 1, 9, dt));
    g.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (!mat || !("emissiveIntensity" in mat)) return;
      mat.emissiveIntensity = damp(mat.emissiveIntensity ?? 0, active ? 0.3 : 0.03, 8, dt);
      mat.opacity = damp(mat.opacity ?? 1, muted ? 0.34 : 1, 8, dt);
      mat.transparent = true;
      mat.wireframe = wireframe;
    });
  });

  return (
    <group
      ref={group}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(id);
      }}
      onPointerOut={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(selected === id ? null : id);
      }}
    >
      {children}
    </group>
  );
}

function Steel({ tone = "#4a4e59" }: { tone?: string }) {
  return (
    <meshStandardMaterial
      color={tone}
      metalness={0.85}
      roughness={0.32}
      transparent
      emissive={new THREE.Color(ACCENT)}
      emissiveIntensity={0.02}
    />
  );
}

/** Floating label anchored to a part — the clickable hotspot. */
function Hotspot({
  id,
  position,
  index,
  name,
  active,
  onHover,
  onSelect,
}: {
  id: ComponentKey;
  position: [number, number, number];
  index: string;
  name: string;
  active: boolean;
  onHover: (k: ComponentKey | null) => void;
  onSelect: (k: ComponentKey | null) => void;
}) {
  return (
    <Html position={position} center distanceFactor={9} zIndexRange={[20, 0]}>
      <button
        type="button"
        aria-label={`Inspect ${name}`}
        onPointerEnter={() => onHover(id)}
        onPointerLeave={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(id);
        }}
        className={`mt-mono flex items-center gap-2 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase backdrop-blur-sm transition-colors ${
          active
            ? "border-primary bg-primary/15 text-primary"
            : "border-border/80 bg-background/70 text-muted-foreground hover:border-foreground hover:text-foreground"
        }`}
      >
        <span
          className={`size-[5px] rounded-full ${active ? "bg-primary" : "bg-muted-foreground"}`}
        />
        {index}
      </button>
    </Html>
  );
}

function Rig({ autoRotate, children }: { autoRotate: boolean; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (g.current && autoRotate) g.current.rotation.y += dt * 0.12;
  });
  return <group ref={g}>{children}</group>;
}

function Model(props: InspectorProps) {
  const { explode, wireframe, hovered, selected, onHover, onSelect } = props;
  const off = (k: ComponentKey) =>
    machineComponents.find((c) => c.key === k)!.offset as [number, number, number];

  return (
    <group position={[0, -1.35, 0]} scale={0.95}>
      <Part
        id="controller"
        offset={off("controller")}
        explode={explode}
        hovered={hovered}
        selected={selected}
        wireframe={wireframe}
        onHover={onHover}
        onSelect={onSelect}
      >
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[1.05, 1.25, 0.24, 40]} />
          <Steel />
        </mesh>
        <mesh position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.62, 0.72, 0.8, 32]} />
          <Steel tone="#3f434d" />
        </mesh>
      </Part>

      <Part
        id="motor"
        offset={off("motor")}
        explode={explode}
        hovered={hovered}
        selected={selected}
        wireframe={wireframe}
        onHover={onHover}
        onSelect={onSelect}
      >
        <mesh position={[0, 1.16, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.42, 0.42, 1.0, 32]} />
          <Steel tone="#565b67" />
        </mesh>
      </Part>

      <Part
        id="arm"
        offset={off("arm")}
        explode={explode}
        hovered={hovered}
        selected={selected}
        wireframe={wireframe}
        onHover={onHover}
        onSelect={onSelect}
      >
        <mesh position={[0.34, 1.95, 0]} rotation={[0, 0, -0.24]}>
          <boxGeometry args={[0.42, 1.7, 0.5]} />
          <Steel />
        </mesh>
        <mesh position={[1.18, 2.74, 0]} rotation={[0, 0, -1.25]}>
          <boxGeometry args={[0.32, 1.7, 0.38]} />
          <Steel />
        </mesh>
        <mesh position={[1.96, 2.98, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.42, 24]} />
          <Steel tone="#5c6270" />
        </mesh>
      </Part>

      <Part
        id="safety"
        offset={off("safety")}
        explode={explode}
        hovered={hovered}
        selected={selected}
        wireframe={wireframe}
        onHover={onHover}
        onSelect={onSelect}
      >
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.85, 0.03, 10, 120]} />
          <Steel tone="#3a3d45" />
        </mesh>
        <mesh position={[0, 0.62, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.85, 0.022, 10, 120]} />
          <Steel tone="#3a3d45" />
        </mesh>
      </Part>

      {machineComponents.map((c) => (
        <Hotspot
          key={c.key}
          id={c.key}
          index={c.index}
          name={c.name}
          position={[
            c.anchor[0] + c.offset[0] * explode * 0.8 * 0.65,
            c.anchor[1] + c.offset[1] * explode * 0.8 * 0.65,
            c.anchor[2] + c.offset[2] * explode * 0.8 * 0.65,
          ]}
          active={hovered === c.key || selected === c.key}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}

      <gridHelper args={[8, 16, "#2a2c33", "#1b1d22"]} position={[0, 0, 0]} />
    </group>
  );
}

export default function InspectorScene(props: InspectorProps) {
  return (
    <Canvas
      dpr={props.tier === "reduced" ? 1 : [1, 1.6]}
      camera={{ position: [4.6, 2.4, 7.2], fov: 36 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onPointerMissed={() => props.onSelect(null)}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[5, 8, 5]} intensity={4} color="#e6eaf2" />
      <directionalLight position={[-6, 3, -4]} intensity={0.6} color={ACCENT} />
      <directionalLight position={[0, 2, 8]} intensity={1.5} color="#cfd6e6" />
      <Suspense fallback={null}>
        <Rig autoRotate={props.autoRotate}>
          <Model {...props} />
        </Rig>
      </Suspense>
      <OrbitControls
        ref={props.controlsRef}
        enablePan={false}
        enableZoom={props.zoomEnabled}
        minDistance={4}
        maxDistance={16}
        minPolarAngle={0.4}
        maxPolarAngle={Math.PI / 2.02}
        dampingFactor={0.08}
        enableDamping
        target={[0, 0.35, 0]}
      />
    </Canvas>
  );
}
