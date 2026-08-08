import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { damp } from "@/lib/motion";

export type RegionKey = "controller" | "motor" | "arm" | "safety";

type Props = {
  /** 0 → physical machine, 1 → fully dematerialised digital asset. */
  phase: number;
  hovered: RegionKey | null;
  selected: RegionKey | null;
  onHover: (k: RegionKey | null) => void;
  onSelect: (k: RegionKey | null) => void;
};

const ACCENT = "#836ef9";

function Metal({ dim, emissive = 0 }: { dim: boolean; emissive?: number }) {
  return (
    <meshStandardMaterial
      color={dim ? "#191a1e" : "#33363d"}
      metalness={0.85}
      roughness={0.3}
      emissive={new THREE.Color(ACCENT)}
      emissiveIntensity={emissive}
    />
  );
}

/** One selectable machine region: solid body + wireframe twin that fades in. */
function Region({
  id,
  children,
  hovered,
  selected,
  phase,
  onHover,
  onSelect,
}: {
  id: RegionKey;
  children: React.ReactNode;
  hovered: RegionKey | null;
  selected: RegionKey | null;
  phase: number;
  onHover: (k: RegionKey | null) => void;
  onSelect: (k: RegionKey | null) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const active = hovered === id || selected === id;
  const muted = selected !== null && selected !== id;

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const target = active ? 1.035 : 1;
    const s = damp(g.scale.x, target, 8, dt);
    g.scale.setScalar(s);
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (!mat || !("emissiveIntensity" in mat)) return;
      mat.emissiveIntensity = damp(
        mat.emissiveIntensity ?? 0,
        active ? 0.5 : muted ? 0 : 0.015 + phase * 0.14,
        6,
        dt,
      );
      if (mat.opacity !== undefined && mat.transparent) {
        mat.opacity = damp(mat.opacity, muted ? 0.18 : 1 - phase * 0.55, 6, dt);
      }
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

function Machine({ phase, hovered, selected, onHover, onSelect }: Props) {
  const root = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const { camera } = useThree();

  useFrame((state, dt) => {
    pointer.current.x = state.pointer.x;
    pointer.current.y = state.pointer.y;
    const g = root.current;
    if (!g) return;

    // Cursor drives rotation; movement is damped so the mass feels real.
    const targetY = pointer.current.x * 0.55 + phase * 0.5;
    const targetX = -pointer.current.y * 0.22;
    g.rotation.y = damp(g.rotation.y, targetY, 2.6, dt);
    g.rotation.x = damp(g.rotation.x, targetX, 2.6, dt);
    g.position.y = damp(g.position.y, -1.35 + Math.sin(state.clock.elapsedTime * 0.6) * 0.02, 4, dt);

    // Scroll pushes the camera back; selecting a part pulls it in.
    const dist = selected ? 5.2 : 7.4 + phase * 1.6;
    camera.position.z = damp(camera.position.z, dist, 2.4, dt);
    camera.position.y = damp(camera.position.y, 0.6 - pointer.current.y * 0.45, 2.4, dt);
    camera.lookAt(0, 0.15, 0);
  });

  const wire = useMemo(() => new THREE.Color(ACCENT), []);

  return (
    <group ref={root} position={[-0.62, -1.35, 0]} scale={0.62}>
      {/* base + column: controller */}
      <Region
        id="controller"
        hovered={hovered}
        selected={selected}
        phase={phase}
        onHover={onHover}
        onSelect={onSelect}
      >
        <mesh position={[0, 0.12, 0]} castShadow>
          <cylinderGeometry args={[1.05, 1.25, 0.24, 32]} />
          <Metal dim={false} />
        </mesh>
        <mesh position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.62, 0.72, 0.8, 24]} />
          <Metal dim={false} />
        </mesh>
      </Region>

      {/* shoulder motor */}
      <Region
        id="motor"
        hovered={hovered}
        selected={selected}
        phase={phase}
        onHover={onHover}
        onSelect={onSelect}
      >
        <mesh position={[0, 1.16, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.42, 0.42, 1.0, 24]} />
          <Metal dim={false} />
        </mesh>
      </Region>

      {/* arm assembly */}
      <Region
        id="arm"
        hovered={hovered}
        selected={selected}
        phase={phase}
        onHover={onHover}
        onSelect={onSelect}
      >
        <mesh position={[0.34, 1.95, 0]} rotation={[0, 0, -0.24]}>
          <boxGeometry args={[0.42, 1.7, 0.5]} />
          <Metal dim={false} />
        </mesh>
        <mesh position={[1.18, 2.74, 0]} rotation={[0, 0, -1.25]}>
          <boxGeometry args={[0.32, 1.7, 0.38]} />
          <Metal dim={false} />
        </mesh>
        <mesh position={[1.96, 2.98, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.42, 20]} />
          <Metal dim={false} />
        </mesh>
      </Region>

      {/* safety cage ring */}
      <Region
        id="safety"
        hovered={hovered}
        selected={selected}
        phase={phase}
        onHover={onHover}
        onSelect={onSelect}
      >
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.85, 0.025, 8, 96]} />
          <meshStandardMaterial
            color="#3a3d45"
            metalness={0.6}
            roughness={0.5}
            emissive={wire}
            emissiveIntensity={0.1}
          />
        </mesh>
        <mesh position={[0, 0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.85, 0.02, 8, 96]} />
          <meshStandardMaterial
            color="#3a3d45"
            metalness={0.6}
            roughness={0.5}
            emissive={wire}
            emissiveIntensity={0.1}
          />
        </mesh>
      </Region>

      {/* wireframe twin — the digital identity emerging from the physical body */}
      <group scale={1.008}>
        <mesh position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.62, 0.72, 0.8, 16]} />
          <meshBasicMaterial wireframe color={ACCENT} transparent opacity={phase * 0.5} />
        </mesh>
        <mesh position={[0.34, 1.95, 0]} rotation={[0, 0, -0.24]}>
          <boxGeometry args={[0.42, 1.7, 0.5]} />
          <meshBasicMaterial wireframe color={ACCENT} transparent opacity={phase * 0.5} />
        </mesh>
        <mesh position={[1.18, 2.74, 0]} rotation={[0, 0, -1.25]}>
          <boxGeometry args={[0.32, 1.7, 0.38]} />
          <meshBasicMaterial wireframe color={ACCENT} transparent opacity={phase * 0.5} />
        </mesh>
      </group>

      <ScanPlane phase={phase} />
      <DataPoints phase={phase} />
    </group>
  );
}

/** Horizontal inspection beam sweeping the machine. */
function ScanPlane({ phase }: { phase: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const m = ref.current;
    if (!m) return;
    const t = (state.clock.elapsedTime * 0.35) % 1;
    m.position.y = t * 3.4;
    const mat = m.material as THREE.MeshBasicMaterial;
    mat.opacity = (0.5 + phase * 0.4) * Math.sin(t * Math.PI);
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.55, 1.68, 96]} />
      <meshBasicMaterial color={ACCENT} transparent opacity={0.2} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** Metadata point cloud that converges as the machine becomes an asset. */
function DataPoints({ phase }: { phase: number }) {
  const ref = useRef<THREE.Points>(null);
  const count = 420;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 1.2 + Math.random() * 2.4;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = Math.random() * 3.6;
      arr[i * 3 + 2] = Math.sin(a) * r;
    }
    return arr;
  }, []);

  useFrame((state, dt) => {
    const p = ref.current;
    if (!p) return;
    p.rotation.y += dt * 0.06;
    const mat = p.material as THREE.PointsMaterial;
    mat.opacity = damp(mat.opacity, 0.15 + phase * 0.65, 3, dt);
    p.scale.setScalar(damp(p.scale.x, 1 - phase * 0.28, 2, dt));
    p.position.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.05;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.022} color={ACCENT} transparent opacity={0.2} sizeAttenuation />
    </points>
  );
}

export default function MachineScene(props: Props) {
  const [dpr, setDpr] = useState(1.5);
  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 0.6, 7.4], fov: 38 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onPointerMissed={() => props.onSelect(null)}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        // Performance budget: drop resolution rather than dropping the effect.
        if (typeof window !== "undefined" && window.innerWidth < 900) setDpr(1);
      }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 7, 5]} intensity={2.1} color="#e6eaf2" />
      <directionalLight position={[-5, 2, -4]} intensity={0.45} color={ACCENT} />
      <Suspense fallback={null}>
        <Machine {...props} />
      </Suspense>
    </Canvas>
  );
}