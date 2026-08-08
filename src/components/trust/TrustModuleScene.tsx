import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Edges, Environment, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { damp } from "@/lib/motion";
import { dataCards, type ModuleKey } from "@/data/trustModule";

const ACCENT = "#836ef9";
const ACCENT_C = new THREE.Color(ACCENT);

export type TrustSceneProps = {
  /** 0..1 scroll position of the hero band. */
  progress: number;
  /** Index into verifySteps. */
  step: number;
  hovered: ModuleKey | null;
  selected: ModuleKey | null;
  tier?: "high" | "reduced";
  onHover: (k: ModuleKey | null) => void;
  onSelect: (k: ModuleKey | null) => void;
  onCardFocus?: (k: string | null) => void;
  /** 0..1 exploded-view separation of the sub-assemblies. */
  explode?: number;
  /** Technical wireframe overlay. */
  wireframe?: boolean;
  /** Hide the floating holographic cards (inspection mode). */
  hideCards?: boolean;
  autoRotate?: boolean;
  zoomEnabled?: boolean;
  controlsRef?: React.MutableRefObject<OrbitControlsImpl | null>;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Where the laser points for each verification step. */
const CARD_POS: Record<string, [number, number, number]> = {
  id: [-2.75, 1.25, 0.55],
  provenance: [2.75, 0.95, -0.25],
  maintenance: [-2.55, -1.05, -0.35],
  parts: [2.6, -1.2, 0.65],
};

function Metal({ tone = "#4b5262", rough = 0.3 }: { tone?: string; rough?: number }) {
  return (
    <meshStandardMaterial
      color={tone}
      metalness={0.92}
      roughness={rough}
      transparent
      emissive={ACCENT_C}
      emissiveIntensity={0.02}
    />
  );
}

/** Selectable sub-assembly of the module. */
const EXPLODE_OFFSET: Record<ModuleKey, [number, number, number]> = {
  chip: [0, 1.5, 0],
  board: [0, 0.35, 0],
  enclosure: [0, 0.9, 0],
  mechanics: [0, -0.6, 0],
};

function Part({
  id,
  hovered,
  selected,
  explode = 0,
  wireframe = false,
  onHover,
  onSelect,
  children,
}: {
  id: ModuleKey;
  hovered: ModuleKey | null;
  selected: ModuleKey | null;
  explode?: number;
  wireframe?: boolean;
  onHover: (k: ModuleKey | null) => void;
  onSelect: (k: ModuleKey | null) => void;
  children: React.ReactNode;
}) {
  const g = useRef<THREE.Group>(null);
  const active = hovered === id || selected === id;
  const muted = selected !== null && selected !== id;

  useFrame((_, dt) => {
    const node = g.current;
    if (!node) return;
    const off = EXPLODE_OFFSET[id];
    node.position.y = damp(node.position.y, off[1] * explode, 4, dt);
    node.position.x = damp(node.position.x, off[0] * explode, 4, dt);
    node.traverse((o) => {
      const mesh = o as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (!mat) return;
      if ("wireframe" in mat) mat.wireframe = wireframe && id !== "enclosure";
      if (!("emissiveIntensity" in mat)) return;
      mat.emissiveIntensity = damp(mat.emissiveIntensity ?? 0, active ? 0.5 : 0.03, 8, dt);
      if ("opacity" in mat) mat.opacity = damp(mat.opacity ?? 1, muted ? 0.4 : 1, 8, dt);
    });
  });

  return (
    <group
      ref={g}
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

/** Glowing pulse travelling along a circuit trace. */
function TracePulse({ path, speed, delay }: { path: [number, number][]; speed: number; delay: number }) {
  const m = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    const node = m.current;
    if (!node) return;
    const t = ((s.clock.elapsedTime * speed + delay) % 1) * (path.length - 1);
    const i = Math.floor(t);
    const f = t - i;
    const a = path[i]!;
    const b = path[Math.min(path.length - 1, i + 1)]!;
    node.position.set(a[0] + (b[0] - a[0]) * f, 0.045, a[1] + (b[1] - a[1]) * f);
  });
  return (
    <mesh ref={m}>
      <sphereGeometry args={[0.035, 10, 10]} />
      <meshBasicMaterial color={ACCENT} transparent opacity={0.95} />
    </mesh>
  );
}

/** Static etched circuit traces on the verification board. */
function Traces() {
  const lines = useMemo<[number, number][][]>(
    () => [
      [
        [-1.3, -0.7],
        [-0.45, -0.7],
        [-0.45, -0.2],
        [0, -0.2],
      ],
      [
        [1.3, 0.6],
        [0.5, 0.6],
        [0.5, 0.15],
        [0, 0.15],
      ],
      [
        [-1.25, 0.75],
        [-0.7, 0.75],
        [-0.7, 0.35],
        [-0.2, 0.35],
      ],
      [
        [1.2, -0.75],
        [0.35, -0.75],
        [0.35, -0.4],
        [0.1, -0.4],
      ],
    ],
    [],
  );

  return (
    <group>
      {lines.map((path, li) => (
        <group key={li}>
          {path.slice(0, -1).map(([x1, z1], i) => {
            const [x2, z2] = path[i + 1]!;
            const len = Math.hypot(x2 - x1, z2 - z1);
            const horiz = Math.abs(x2 - x1) > Math.abs(z2 - z1);
            return (
              <mesh
                key={i}
                position={[(x1 + x2) / 2, 0.032, (z1 + z2) / 2]}
                rotation={[-Math.PI / 2, 0, horiz ? 0 : Math.PI / 2]}
              >
                <planeGeometry args={[len, 0.018]} />
                <meshBasicMaterial color={ACCENT} transparent opacity={0.34} />
              </mesh>
            );
          })}
          <TracePulse path={path} speed={0.22 + li * 0.05} delay={li * 0.27} />
        </group>
      ))}
    </group>
  );
}

/** The central cryptographic identity chip. */
function TrustChip({ active, step }: { active: boolean; step: number }) {
  const halo = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.MeshStandardMaterial>(null);
  const pins = useMemo(() => [-0.3, -0.18, -0.06, 0.06, 0.18, 0.3], []);

  useFrame((s, dt) => {
    const hot = active || step >= 1 ? 1 : 0.35;
    if (core.current)
      core.current.emissiveIntensity = damp(
        core.current.emissiveIntensity,
        hot * (0.9 + Math.sin(s.clock.elapsedTime * 2.4) * 0.25),
        6,
        dt,
      );
    if (halo.current) {
      const mat = halo.current.material as THREE.MeshBasicMaterial;
      mat.opacity = damp(mat.opacity, active ? 0.5 : 0.16, 6, dt);
      halo.current.rotation.z += dt * 0.5;
    }
  });

  return (
    <group position={[0, 0.09, 0]}>
      {/* chip package */}
      <mesh castShadow>
        <boxGeometry args={[0.82, 0.13, 0.82]} />
        <meshStandardMaterial color="#15171d" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* etched identity face */}
      <mesh position={[0, 0.071, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.56, 0.56]} />
        <meshStandardMaterial
          ref={core}
          color="#0d0e12"
          emissive={ACCENT_C}
          emissiveIntensity={0.4}
          metalness={0.2}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[0, 0.075, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.17, 0.2, 6]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.9} />
      </mesh>
      {/* rotating holographic halo */}
      <mesh ref={halo} position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.62, 0.68, 64, 1, 0, Math.PI * 1.4]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
      {/* gold pins */}
      {pins.map((p) => (
        <group key={p}>
          {[-0.45, 0.45].map((s) => (
            <mesh key={s} position={[p, -0.03, s]}>
              <boxGeometry args={[0.05, 0.03, 0.12]} />
              <meshStandardMaterial color="#c8a45c" metalness={1} roughness={0.28} />
            </mesh>
          ))}
          {[-0.45, 0.45].map((s) => (
            <mesh key={`x${s}`} position={[s, -0.03, p]}>
              <boxGeometry args={[0.12, 0.03, 0.05]} />
              <meshStandardMaterial color="#c8a45c" metalness={1} roughness={0.28} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Thin purple verification laser that locks onto a target point. */
function Laser({ step, progress }: { step: number; progress: number }) {
  const beam = useRef<THREE.Mesh>(null);
  const dot = useRef<THREE.Mesh>(null);
  const target = useRef(new THREE.Vector3(0, 0.2, 0));
  const origin = useMemo(() => new THREE.Vector3(0, 3.1, 0), []);

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    const stepTarget = new THREE.Vector3();
    const key = ["module", "id", "provenance", "parts", "maintenance", "module"][step] ?? "module";
    if (key === "module") {
      // idle: slow sweep across the module surface
      const sweep = step >= 5 ? 0 : Math.sin(t * 0.55) * 1.1;
      stepTarget.set(sweep, 0.16, Math.cos(t * 0.34) * 0.6);
    } else {
      const p = CARD_POS[key]!;
      stepTarget.set(p[0] * 0.92, p[1], p[2]);
    }
    target.current.lerp(stepTarget, 1 - Math.exp(-(step === 0 ? 4 : 9) * dt));

    const dir = new THREE.Vector3().subVectors(target.current, origin);
    const len = dir.length();
    if (beam.current) {
      beam.current.position.copy(origin).addScaledVector(dir, 0.5);
      beam.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      beam.current.scale.set(1, len, 1);
      const mat = beam.current.material as THREE.MeshBasicMaterial;
      const on = step >= 1 && step <= 4 ? 0.85 : 0.3 + Math.sin(t * 1.6) * 0.08;
      mat.opacity = damp(mat.opacity, clamp01(on) * (0.4 + progress * 0.6), 7, dt);
    }
    if (dot.current) {
      dot.current.position.copy(target.current);
      dot.current.scale.setScalar(1 + Math.sin(t * 9) * 0.18);
    }
  });

  return (
    <group>
      <mesh ref={beam}>
        <cylinderGeometry args={[0.006, 0.006, 1, 8, 1, true]} />
        <meshBasicMaterial
          color={ACCENT}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={dot}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.9} />
      </mesh>
      <pointLight position={[0, 3, 0]} intensity={4} distance={7} color={ACCENT} />
    </group>
  );
}

/** Holographic data card floating around the module. */
function HoloCard({
  position,
  active,
  index,
}: {
  position: [number, number, number];
  active: boolean;
  index: number;
}) {
  const g = useRef<THREE.Group>(null);
  const edge = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((s, dt) => {
    const node = g.current;
    if (!node) return;
    const t = s.clock.elapsedTime;
    node.position.y = position[1] + Math.sin(t * 0.7 + index) * 0.09;
    node.position.z = damp(node.position.z, position[2] + (active ? 0.35 : 0), 5, dt);
    node.rotation.y = damp(node.rotation.y, position[0] > 0 ? -0.38 : 0.38, 4, dt);
    node.rotation.x = Math.sin(t * 0.5 + index) * 0.04;
    node.scale.setScalar(damp(node.scale.x, active ? 1.08 : 1, 7, dt));
    if (edge.current) edge.current.opacity = damp(edge.current.opacity, active ? 0.95 : 0.32, 7, dt);
  });
  return (
    <group ref={g} position={position}>
      <mesh>
        <planeGeometry args={[1.15, 0.66]} />
        <meshBasicMaterial
          color={ACCENT}
          transparent
          opacity={active ? 0.1 : 0.05}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <planeGeometry args={[1.15, 0.66]} />
        <meshBasicMaterial ref={edge} color={ACCENT} transparent opacity={0.3} wireframe />
      </mesh>
    </group>
  );
}

function Motes({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 8;
      arr[i * 3 + 1] = (Math.random() - 0.4) * 4.5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    return arr;
  }, [count]);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.02;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.018} color={ACCENT} transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

function Module(props: TrustSceneProps) {
  const { hovered, selected, onHover, onSelect, tier } = props;
  const shared = { hovered, selected, onHover, onSelect, explode: props.explode ?? 0, wireframe: props.wireframe ?? false };
  const root = useRef<THREE.Group>(null);
  const lid = useRef<THREE.Group>(null);
  const shellA = useRef<THREE.Group>(null);
  const shellB = useRef<THREE.Group>(null);
  const pointer = useThree((s) => s.pointer);

  const open = props.step >= 1 ? 1 : clamp01(props.progress * 2.4);

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    if (root.current) {
      root.current.position.y = damp(root.current.position.y, Math.sin(t * 0.6) * 0.06, 3, dt);
      // cursor-reactive parallax on top of orbit control rotation
      root.current.rotation.x = damp(root.current.rotation.x, -pointer.y * 0.09, 3, dt);
    }
    if (lid.current) lid.current.position.y = damp(lid.current.position.y, open * 0.75, 3.2, dt);
    if (shellA.current) shellA.current.position.x = damp(shellA.current.position.x, open * 0.45, 3, dt);
    if (shellB.current) shellB.current.position.x = damp(shellB.current.position.x, -open * 0.45, 3, dt);
  });

  const glassProps =
    tier === "reduced"
      ? { color: "#6d7ba0", transparent: true, opacity: 0.07, metalness: 0.1, roughness: 0.1 }
      : {
          color: "#7e8db6",
          transparent: true,
          opacity: 0.08,
          metalness: 0.05,
          roughness: 0.06,
          transmission: 0.85,
          thickness: 0.5,
          ior: 1.35,
        };

  return (
    <group ref={root} scale={0.62}>
      {/* verification board + chip */}
      <Part id="board" {...shared}>
        <mesh position={[0, 0, 0]} receiveShadow castShadow>
          <boxGeometry args={[3.1, 0.06, 2.1]} />
          <meshStandardMaterial color="#101319" metalness={0.5} roughness={0.5} />
          <Edges color={ACCENT} />
        </mesh>
        <Traces />
        {/* small mechanical components */}
        {[
          [-1.15, 0.62],
          [-1.15, -0.62],
          [1.15, 0.62],
        ].map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x!, 0.12, z!]} castShadow>
            <cylinderGeometry args={[0.11, 0.11, 0.22, 20]} />
            <meshStandardMaterial color="#3a4050" metalness={0.85} roughness={0.3} />
          </mesh>
        ))}
        <mesh position={[1.15, 0.08, -0.62]} castShadow>
          <boxGeometry args={[0.42, 0.14, 0.28]} />
          <meshStandardMaterial color="#242a36" metalness={0.7} roughness={0.35} />
        </mesh>
      </Part>

      <Part id="chip" {...shared}>
        <TrustChip active={hovered === "chip" || selected === "chip" || props.step === 1} step={props.step} />
      </Part>

      {/* metallic frame + mounts */}
      <Part id="mechanics" {...shared}>
        {[
          [-1.62, 1.12],
          [1.62, 1.12],
          [-1.62, -1.12],
          [1.62, -1.12],
        ].map(([x, z]) => (
          <mesh key={`p${x}${z}`} position={[x!, 0.42, z!]} castShadow>
            <boxGeometry args={[0.1, 1.0, 0.1]} />
            <Metal tone="#5c6474" />
          </mesh>
        ))}
        <mesh position={[0, -0.09, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.5, 0.14, 2.5]} />
          <Metal tone="#3d4351" rough={0.4} />
          <Edges color="#2b3040" />
        </mesh>
        <mesh position={[0, 0.94, 0]}>
          <boxGeometry args={[3.5, 0.08, 2.5]} />
          <Metal tone="#3d4351" rough={0.4} />
        </mesh>
      </Part>

      {/* transparent protective enclosure — splits open on activation */}
      <Part id="enclosure" {...shared}>
        <group ref={lid}>
          <mesh position={[0, 1.0, 0]}>
            <boxGeometry args={[3.4, 0.04, 2.4]} />
            <meshPhysicalMaterial {...glassProps} />
            <Edges color={ACCENT} />
          </mesh>
        </group>
        <group ref={shellA}>
          <mesh position={[1.7, 0.45, 0]}>
            <boxGeometry args={[0.04, 1.1, 2.4]} />
            <meshPhysicalMaterial {...glassProps} />
            <Edges color={ACCENT} />
          </mesh>
        </group>
        <group ref={shellB}>
          <mesh position={[-1.7, 0.45, 0]}>
            <boxGeometry args={[0.04, 1.1, 2.4]} />
            <meshPhysicalMaterial {...glassProps} />
            <Edges color={ACCENT} />
          </mesh>
        </group>
        <mesh position={[0, 0.45, 1.2]}>
          <boxGeometry args={[3.4, 1.1, 0.04]} />
          <meshPhysicalMaterial {...glassProps} />
          <Edges color="#3b4256" />
        </mesh>
        <mesh position={[0, 0.45, -1.2]}>
          <boxGeometry args={[3.4, 1.1, 0.04]} />
          <meshPhysicalMaterial {...glassProps} />
          <Edges color="#3b4256" />
        </mesh>
      </Part>

      {props.hideCards
        ? null
        : dataCards.map((c, i) => (
        <HoloCard
          key={c.key}
          index={i}
          position={CARD_POS[c.key] ?? [0, 0, 0]}
            active={
              ["module", "id", "provenance", "parts", "maintenance", "module"][props.step] === c.key
            }
          />
        ))}

      <Laser step={props.step} progress={props.progress} />
      <Motes count={tier === "reduced" ? 60 : 220} />
    </group>
  );
}

export default function TrustModuleScene(props: TrustSceneProps) {
  const reduced = props.tier === "reduced";
  return (
    <Canvas
      shadows={!reduced}
      dpr={reduced ? 1 : [1, 1.6]}
      camera={{ position: [5.2, 2.9, 7.2], fov: 30 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onPointerMissed={() => props.onSelect(null)}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <ambientLight intensity={0.5} />
      <Environment preset="city" environmentIntensity={0.55} />
      <directionalLight
        position={[5, 8, 4]}
        intensity={2.6}
        color="#c9d4ea"
        castShadow={!reduced}
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-6, 2, -4]} intensity={0.9} color={ACCENT} />
      <hemisphereLight args={["#8fa0c4", "#0a0b0e", 0.5]} />
      <Suspense fallback={null}>
        <Module {...props} />
        {reduced ? null : (
          <ContactShadows position={[0, -1.6, 0]} opacity={0.45} scale={14} blur={2.8} far={6} />
        )}
      </Suspense>
      <OrbitControls
        ref={props.controlsRef as never}
        makeDefault
        autoRotate={props.autoRotate ?? false}
        autoRotateSpeed={0.6}
        enablePan={false}
        enableZoom={props.zoomEnabled ?? true}
        minDistance={4.5}
        maxDistance={11}
        minPolarAngle={0.5}
        maxPolarAngle={Math.PI / 2.02}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.6}
        target={[0, 0.25, 0]}
      />
    </Canvas>
  );
}
