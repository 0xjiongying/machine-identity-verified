import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Edges, Environment, Html, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { damp } from "@/lib/motion";
import { dataCards, moduleParts, type ModuleKey } from "@/data/trustModule";

const ACCENT = "#836ef9";
const ACCENT_C = new THREE.Color(ACCENT);
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export type TrustSceneProps = {
  /** 0..1 scroll position of the hero band. */
  progress: number;
  /** Index into verifySteps (0..n-1). */
  step: number;
  hovered: ModuleKey | null;
  selected: ModuleKey | null;
  tier?: "high" | "reduced";
  onHover: (k: ModuleKey | null) => void;
  onSelect: (k: ModuleKey | null) => void;
  onCardFocus?: (k: string | null) => void;
  /** 0..1 exploded-view separation of the modules. */
  explode?: number;
  wireframe?: boolean;
  /** Hide the floating holographic cards (inspection mode). */
  hideCards?: boolean;
  /** Hide in-scene hotspot markers. */
  hideHotspots?: boolean;
  autoRotate?: boolean;
  zoomEnabled?: boolean;
  /** Touch/coarse pointer device — tunes controls and disables cursor parallax. */
  coarse?: boolean;
  /** Honour prefers-reduced-motion: static pose, no idle drift, no auto frames. */
  reducedMotion?: boolean;
  /** Stop rendering entirely when the scene is off-screen. */
  paused?: boolean;
  controlsRef?: React.MutableRefObject<OrbitControlsImpl | null>;
  scale?: number;
  offsetX?: number;
};

/* ------------------------------------------------------------------ layout */

/** Seat position of each module on the chassis. */
const SEAT: Record<ModuleKey, [number, number, number]> = {
  controller: [-1.05, 0.34, 0.62],
  motor: [-1.0, 0.36, -0.6],
  arm: [1.15, 0.42, 0.0],
  safety: [0.05, 0.34, 0.78],
};

/** Direction each module travels in the exploded view. */
const EXPLODE_OFFSET: Record<ModuleKey, [number, number, number]> = {
  controller: [-1.15, 0.55, 0.85],
  motor: [-1.0, -0.15, -1.05],
  arm: [1.1, 1.05, 0.1],
  safety: [0.15, 0.35, 1.15],
};

/** Laser lock points (module seats, slightly raised). */
const PART_POS: Record<ModuleKey, [number, number, number]> = {
  controller: [-1.05, 0.62, 0.62],
  motor: [-1.05, 0.6, -0.62],
  arm: [1.15, 0.95, 0.0],
  safety: [0.05, 0.6, 0.78],
};

const CARD_POS: Record<string, [number, number, number]> = {
  passport: [-2.85, 1.2, 0.5],
  cvi: [2.85, 1.0, -0.2],
  cva: [-2.6, -0.95, -0.35],
  ccp: [2.6, -1.15, 0.6],
  core: [0, 0.5, 0],
};

/* ------------------------------------------------------------- materials */

function Steel({ tone = "#464c59", rough = 0.34 }: { tone?: string; rough?: number }) {
  return (
    <meshStandardMaterial
      color={tone}
      metalness={0.94}
      roughness={rough}
      transparent
      emissive={ACCENT_C}
      emissiveIntensity={0.02}
    />
  );
}

/* ------------------------------------------------------------------ parts */

function Module({
  id,
  hovered,
  selected,
  explode = 0,
  wireframe = false,
  assembly,
  onHover,
  onSelect,
  children,
}: {
  id: ModuleKey;
  hovered: ModuleKey | null;
  selected: ModuleKey | null;
  explode?: number;
  wireframe?: boolean;
  /** 0 → coiled at the spine, 1 → seated on the chassis. */
  assembly: React.MutableRefObject<number>;
  onHover: (k: ModuleKey | null) => void;
  onSelect: (k: ModuleKey | null) => void;
  children: React.ReactNode;
}) {
  const g = useRef<THREE.Group>(null);
  const active = hovered === id || selected === id;
  const muted = selected !== null && selected !== id;
  const seat = SEAT[id];
  const off = EXPLODE_OFFSET[id];

  useFrame((s, dt) => {
    const node = g.current;
    if (!node) return;
    const a = assembly.current;
    // coil → unfold: modules rise out of the spine into their seats.
    const lift = active ? 0.06 : 0;
    node.position.x = damp(node.position.x, seat[0] * a + off[0] * explode, 5, dt);
    node.position.y = damp(
      node.position.y,
      (seat[1] - 0.28) * a - 0.1 * (1 - a) + off[1] * explode + lift,
      5,
      dt,
    );
    node.position.z = damp(node.position.z, seat[2] * a + off[2] * explode, 5, dt);
    node.rotation.y = damp(node.rotation.y, (1 - a) * 0.9, 4, dt);
    const sc = 0.55 + 0.45 * a;
    node.scale.setScalar(damp(node.scale.x, sc, 5, dt));
    // gentle machine idle
    node.position.y += Math.sin(s.clock.elapsedTime * 1.4 + seat[0]) * 0.004 * a;

    node.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (!mat) return;
      if ("wireframe" in mat) mat.wireframe = wireframe;
      if (!("emissiveIntensity" in mat)) return;
      mat.emissiveIntensity = damp(mat.emissiveIntensity ?? 0, active ? 0.55 : 0.04, 8, dt);
      if ("opacity" in mat) mat.opacity = damp(mat.opacity ?? 1, muted ? 0.38 : 1, 8, dt);
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

/** Precision-milled controller card: vents, connector pins, status strip. */
function ControllerModule({ lit }: { lit: number }) {
  return (
    <group>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.92, 0.42, 0.66]} />
        <Steel tone="#3d434f" rough={0.38} />
        <Edges color={ACCENT} />
      </mesh>
      {/* recessed panel */}
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[0.7, 0.02, 0.44]} />
        <meshStandardMaterial color="#0e1117" metalness={0.6} roughness={0.5} />
      </mesh>
      {/* cooling fins */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[-0.4 + i * 0.16, 0.05, 0.34]}>
          <boxGeometry args={[0.05, 0.26, 0.02]} />
          <meshStandardMaterial color="#2a2f38" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
      {/* connector pins */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={`p${i}`} position={[-0.34 + i * 0.1, -0.16, -0.35]}>
          <boxGeometry args={[0.035, 0.06, 0.06]} />
          <meshStandardMaterial
            color="#c9a227"
            metalness={1}
            roughness={0.25}
            emissive={ACCENT_C}
            emissiveIntensity={0.12}
          />
        </mesh>
      ))}
      {/* signing status strip */}
      <mesh position={[0, 0.235, 0.16]}>
        <planeGeometry args={[0.5, 0.03]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.35 + lit * 0.6} />
      </mesh>
    </group>
  );
}

/** Servo drive: stator body, rotating shaft, machined flange. */
function MotorModule({ spin }: { spin: number }) {
  const shaft = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (shaft.current) shaft.current.rotation.z += dt * (0.6 + spin * 5);
  });
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.28, 0.28, 0.78, 28]} />
        <Steel tone="#4e5462" rough={0.28} />
        <Edges color={ACCENT} />
      </mesh>
      {/* stator ribs */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i} rotation={[0, (i / 10) * Math.PI * 2, 0]} position={[0, 0, 0]}>
          <boxGeometry args={[0.5, 0.7, 0.015]} />
          <meshStandardMaterial color="#333944" metalness={0.9} roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.33, 0.33, 0.07, 28]} />
        <meshStandardMaterial color="#2b303a" metalness={0.95} roughness={0.25} />
      </mesh>
      <group ref={shaft} position={[0, 0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.07, 0.07, 0.3, 16]} />
          <meshStandardMaterial color="#8b93a3" metalness={1} roughness={0.18} />
        </mesh>
        <mesh position={[0, 0.16, 0]}>
          <boxGeometry args={[0.24, 0.02, 0.05]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0.7} />
        </mesh>
      </group>
    </group>
  );
}

/** Articulated arm linkage that unfolds and works through a slow cycle. */
function ArmModule({ cycle }: { cycle: number }) {
  const j1 = useRef<THREE.Group>(null);
  const j2 = useRef<THREE.Group>(null);
  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    const a = 0.55 + Math.sin(t * 0.6) * 0.35 * cycle;
    const b = -0.9 - Math.sin(t * 0.6 + 0.9) * 0.5 * cycle;
    if (j1.current) j1.current.rotation.z = damp(j1.current.rotation.z, a, 3, dt);
    if (j2.current) j2.current.rotation.z = damp(j2.current.rotation.z, b, 3, dt);
  });
  return (
    <group>
      {/* turret base */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.36, 0.26, 24]} />
        <Steel tone="#454b58" />
        <Edges color={ACCENT} />
      </mesh>
      <group ref={j1} position={[0, 0.14, 0]}>
        <mesh position={[0, 0.3, 0]} castShadow>
          <boxGeometry args={[0.16, 0.62, 0.2]} />
          <Steel tone="#525968" rough={0.3} />
          <Edges color={ACCENT} />
        </mesh>
        {/* joint hub */}
        <mesh position={[0, 0.62, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.24, 18]} />
          <meshStandardMaterial
            color="#20242c"
            metalness={0.9}
            roughness={0.3}
            emissive={ACCENT_C}
            emissiveIntensity={0.2}
          />
        </mesh>
        <group ref={j2} position={[0, 0.62, 0]}>
          <mesh position={[0, 0.26, 0]} castShadow>
            <boxGeometry args={[0.12, 0.52, 0.16]} />
            <Steel tone="#5b6272" rough={0.28} />
            <Edges color={ACCENT} />
          </mesh>
          <mesh position={[0, 0.55, 0]}>
            <boxGeometry args={[0.16, 0.1, 0.14]} />
            <meshStandardMaterial
              color="#1a1e25"
              metalness={0.8}
              roughness={0.4}
              emissive={ACCENT_C}
              emissiveIntensity={0.35}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/** Safety guard: interlock ring, grille, beacon. */
function SafetyModule({ alert }: { alert: number }) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!ring.current) return;
    const m = ring.current.material as THREE.MeshBasicMaterial;
    m.opacity = 0.3 + (Math.sin(s.clock.elapsedTime * 2.4) * 0.5 + 0.5) * (0.25 + alert * 0.5);
  });
  return (
    <group>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.6, 0.34, 0.46]} />
        <Steel tone="#3f4550" rough={0.42} />
        <Edges color={ACCENT} />
      </mesh>
      {/* grille */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} position={[0, -0.1 + i * 0.05, 0.235]}>
          <boxGeometry args={[0.42, 0.015, 0.01]} />
          <meshStandardMaterial color="#22262e" metalness={0.85} roughness={0.4} />
        </mesh>
      ))}
      {/* interlock ring */}
      <mesh ref={ring} position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.16, 0.2, 32]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.07, 20, 20]} />
        <meshStandardMaterial
          color="#12151b"
          metalness={0.4}
          roughness={0.2}
          emissive={ACCENT_C}
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

/** Etched serial markings on the chassis deck. */
function Markings() {
  return (
    <group position={[0, 0.075, 1.02]}>
      {Array.from({ length: 14 }).map((_, i) => (
        <mesh key={i} position={[-0.9 + i * 0.14, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.05, i % 3 === 0 ? 0.1 : 0.05]} />
          <meshBasicMaterial color="#6c7284" transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/** Data line carrying a pulse from a module into the signing spine. */
function DataLine({
  from,
  live,
  delay,
}: {
  from: [number, number, number];
  live: number;
  delay: number;
}) {
  const dot = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => {
    const pts = [
      new THREE.Vector3(from[0], from[1] - 0.2, from[2]),
      new THREE.Vector3(from[0] * 0.4, 0.1, from[2] * 0.4),
      new THREE.Vector3(0, 0.42, 0),
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    return { curve, geometry: new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)) };
  }, [from]);

  useFrame((s) => {
    if (!dot.current) return;
    const t = (s.clock.elapsedTime * 0.45 + delay) % 1;
    const p = geo.curve.getPoint(t);
    dot.current.position.copy(p);
    dot.current.visible = live > 0.05;
    dot.current.scale.setScalar(0.6 + live * 0.8);
  });

  return (
    <group>
      <primitive object={new THREE.Line(geo.geometry, new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.12 + live * 0.35 }))} />
      <mesh ref={dot}>
        <sphereGeometry args={[0.03, 10, 10]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.35 + live * 0.65} />
      </mesh>
    </group>
  );
}

/** The central signing spine — where the passport hash is formed. */
function Spine({ step }: { step: number }) {
  const core = useRef<THREE.Mesh>(null);
  useFrame((s, dt) => {
    if (!core.current) return;
    const m = core.current.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = damp(
      m.emissiveIntensity,
      0.25 + Math.min(1, step / 8) * 1.4 + Math.sin(s.clock.elapsedTime * 2) * 0.08,
      4,
      dt,
    );
    core.current.rotation.y += dt * 0.35;
  });
  return (
    <group position={[0, 0.42, 0]}>
      <mesh ref={core} castShadow>
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial
          color="#131722"
          metalness={0.7}
          roughness={0.22}
          emissive={ACCENT_C}
          emissiveIntensity={0.4}
        />
        <Edges color={ACCENT} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.42, 0.46, 48]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** Structural wireframe cage that reads as engineering drawing. */
function Cage({ on }: { on: number }) {
  return (
    <mesh position={[0, 0.42, 0]}>
      <boxGeometry args={[3.3, 1.05, 2.12]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      <Edges color={ACCENT} scale={1}>
        <lineBasicMaterial color={ACCENT} transparent opacity={0.06 + on * 0.16} />
      </Edges>
    </mesh>
  );
}

/** Verification laser, locked to the active module or stage target. */
function Laser({
  target,
  strength,
}: {
  target: [number, number, number];
  strength: number;
}) {
  const g = useRef<THREE.Group>(null);
  const dot = useRef<THREE.Mesh>(null);
  const origin = useMemo(() => new THREE.Vector3(0, 3.1, 1.4), []);
  const vec = useMemo(() => new THREE.Vector3(), []);

  useFrame((s, dt) => {
    const node = g.current;
    if (!node) return;
    vec.set(target[0], target[1], target[2]);
    const wob = Math.sin(s.clock.elapsedTime * 1.5) * 0.03;
    const mid = origin.clone().lerp(vec, 0.5);
    node.position.copy(mid);
    const dir = vec.clone().sub(origin);
    node.scale.y = damp(node.scale.y, dir.length(), 6, dt);
    node.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    const mat = (node.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
    mat.opacity = damp(mat.opacity, 0.1 + strength * 0.5 + wob, 5, dt);
    if (dot.current) {
      dot.current.position.copy(vec);
      const dm = dot.current.material as THREE.MeshBasicMaterial;
      dm.opacity = damp(dm.opacity, 0.25 + strength * 0.7, 5, dt);
      dot.current.scale.setScalar(damp(dot.current.scale.x, 0.7 + strength * 0.9, 5, dt));
    }
  });

  return (
    <group>
      <group ref={g}>
        <mesh>
          <cylinderGeometry args={[0.006, 0.006, 1, 8]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0.2} depthWrite={false} />
        </mesh>
      </group>
      <mesh ref={dot} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.06, 0.1, 24]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** Floating holographic record card. */
function HoloCard({
  position,
  label,
  value,
  live,
}: {
  position: [number, number, number];
  label: string;
  value: string;
  live: boolean;
}) {
  const g = useRef<THREE.Group>(null);
  useFrame((s, dt) => {
    if (!g.current) return;
    g.current.position.y = damp(
      g.current.position.y,
      position[1] + Math.sin(s.clock.elapsedTime * 0.8 + position[0]) * 0.06,
      3,
      dt,
    );
  });
  return (
    <group ref={g} position={position}>
      <mesh>
        <planeGeometry args={[1.5, 0.62]} />
        <meshBasicMaterial color="#0b0d12" transparent opacity={live ? 0.72 : 0.35} />
        <Edges color={ACCENT} />
      </mesh>
      <Html center distanceFactor={7} transform={false} zIndexRange={[10, 0]}>
        <div
          className={`mt-mono w-[150px] text-center text-[8px] tracking-[0.16em] uppercase ${
            live ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <div>{label}</div>
          <div className="mt-1 text-foreground/80">{value}</div>
        </div>
      </Html>
    </group>
  );
}

/** In-scene hotspot marker for a module. */
function Hotspot({
  id,
  active,
  onHover,
  onSelect,
  selected,
}: {
  id: ModuleKey;
  active: boolean;
  selected: ModuleKey | null;
  onHover: (k: ModuleKey | null) => void;
  onSelect: (k: ModuleKey | null) => void;
}) {
  const part = moduleParts.find((p) => p.key === id)!;
  const pos = PART_POS[id];
  return (
    <Html position={[pos[0], pos[1] + 0.22, pos[2]]} center zIndexRange={[20, 0]}>
      <button
        type="button"
        onPointerEnter={() => onHover(id)}
        onPointerLeave={() => onHover(null)}
        onClick={() => onSelect(selected === id ? null : id)}
        className={`mt-mono flex items-center gap-1.5 border px-2 py-1 text-[8px] tracking-[0.18em] whitespace-nowrap uppercase backdrop-blur-sm transition-colors ${
          active
            ? "border-primary bg-primary/15 text-primary"
            : "border-border/70 bg-background/70 text-muted-foreground hover:border-primary/60 hover:text-foreground"
        }`}
      >
        <span
          className={`h-1 w-1 ${active ? "bg-primary" : "bg-muted-foreground"}`}
          aria-hidden="true"
        />
        {part.name}
      </button>
    </Html>
  );
}

/* ------------------------------------------------------------------ rig */

function Rig({
  progress,
  step,
  hovered,
  selected,
  explode = 0,
  wireframe = false,
  hideCards,
  hideHotspots,
  onHover,
  onSelect,
  scale,
  offsetX,
  tier,
  coarse,
  reducedMotion,
}: TrustSceneProps) {
  const root = useRef<THREE.Group>(null);
  const assembly = useRef(0);
  const { pointer } = useThree();
  const p = clamp01(progress);
  const low = tier === "reduced";

  useFrame((s, dt) => {
    const node = root.current;
    if (reducedMotion) {
      // Static, fully-assembled pose — no drift, no parallax.
      assembly.current = 1;
      if (node) {
        node.rotation.set(0.08, -0.5 + p * 1.0, 0);
        node.position.y = -0.5;
      }
      return;
    }
    // coil → unfold: driven by scroll, with a small automatic wake-up.
    const target = clamp01(Math.max(p * 2.2, Math.min(1, s.clock.elapsedTime / 2.2)));
    assembly.current = damp(assembly.current, target, 2.4, dt);

    if (!node) return;
    // Cursor parallax only on fine pointers — on touch it fights orbit drag.
    const px = coarse ? 0 : pointer.x;
    const py = coarse ? 0 : pointer.y;
    node.rotation.y = damp(
      node.rotation.y,
      -0.5 + p * 1.0 + px * 0.35,
      3,
      dt,
    );
    node.rotation.x = damp(node.rotation.x, 0.08 - py * 0.14, 3, dt);
    node.position.y = damp(node.position.y, -0.5 + Math.sin(s.clock.elapsedTime * 0.6) * 0.02, 3, dt);
  });

  // compact→wake→unfold→assemble→scan→inspect→verify→tokenize→ready
  const stageTarget = [
    "core",
    "core",
    "core",
    "passport",
    "passport",
    "passport",
    "cvi",
    "cva",
    "ccp",
  ][Math.min(8, Math.max(0, step))];
  const laserTarget = selected
    ? PART_POS[selected]
    : (CARD_POS[stageTarget ?? "core"] ?? CARD_POS["core"]!);

  const cycle = clamp01(step / 8);

  return (
    <group ref={root} scale={scale ?? 0.56} position={[offsetX ?? 0, 0, 0]}>
      {/* chassis deck */}
      <mesh position={[0, 0, 0]} receiveShadow castShadow>
        <boxGeometry args={[3.2, 0.14, 2.05]} />
        <meshStandardMaterial color="#12151b" metalness={0.7} roughness={0.44} />
        <Edges color={ACCENT} />
      </mesh>
      {/* recessed rails */}
      {[-0.62, 0.62].map((z) => (
        <mesh key={z} position={[0, 0.08, z]}>
          <boxGeometry args={[2.7, 0.02, 0.16]} />
          <meshStandardMaterial color="#080a0e" metalness={0.5} roughness={0.6} />
        </mesh>
      ))}
      {/* machined feet */}
      {[
        [-1.42, -0.86],
        [1.42, -0.86],
        [-1.42, 0.86],
        [1.42, 0.86],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x!, -0.13, z!]}>
          <cylinderGeometry args={[0.1, 0.12, 0.14, 16]} />
          <meshStandardMaterial color="#2a2f38" metalness={0.9} roughness={0.35} />
        </mesh>
      ))}
      <Markings />
      <Cage on={wireframe ? 1 : clamp01(step / 8)} />
      <Spine step={step} />

      {(Object.keys(SEAT) as ModuleKey[]).map((k, i) => (
        <DataLine key={`dl-${k}`} from={SEAT[k]} live={cycle} delay={i * 0.25} />
      ))}

      <Module
        id="controller"
        hovered={hovered}
        selected={selected}
        explode={explode}
        wireframe={wireframe}
        assembly={assembly}
        onHover={onHover}
        onSelect={onSelect}
      >
        <ControllerModule lit={cycle} />
      </Module>

      <Module
        id="motor"
        hovered={hovered}
        selected={selected}
        explode={explode}
        wireframe={wireframe}
        assembly={assembly}
        onHover={onHover}
        onSelect={onSelect}
      >
        <MotorModule spin={cycle} />
      </Module>

      <Module
        id="arm"
        hovered={hovered}
        selected={selected}
        explode={explode}
        wireframe={wireframe}
        assembly={assembly}
        onHover={onHover}
        onSelect={onSelect}
      >
        <ArmModule cycle={cycle} />
      </Module>

      <Module
        id="safety"
        hovered={hovered}
        selected={selected}
        explode={explode}
        wireframe={wireframe}
        assembly={assembly}
        onHover={onHover}
        onSelect={onSelect}
      >
        <SafetyModule alert={cycle} />
      </Module>

      {!hideHotspots && !low
        ? (Object.keys(SEAT) as ModuleKey[]).map((k) => (
            <Hotspot
              key={`hs-${k}`}
              id={k}
              selected={selected}
              active={hovered === k || selected === k}
              onHover={onHover}
              onSelect={onSelect}
            />
          ))
        : null}

      {!hideCards
        ? dataCards.map((c) => (
            <HoloCard
              key={c.key}
              position={CARD_POS[c.key] ?? [0, 1, 0]}
              label={c.label}
              value={step >= c.at ? c.live.value : c.pending.value}
              live={step >= c.at}
            />
          ))
        : null}

      <Laser target={laserTarget} strength={selected ? 1 : 0.35 + cycle * 0.5} />
    </group>
  );
}

/* ---------------------------------------------------------------- canvas */

export default function TrustModuleScene(props: TrustSceneProps) {
  const { controlsRef, autoRotate, zoomEnabled, tier, coarse, reducedMotion, paused } = props;
  const low = tier === "reduced";
  // Touch devices get pinch-to-zoom by default; reduced motion renders on demand.
  const zoom = zoomEnabled ?? Boolean(coarse);
  const frameloop = paused ? "never" : reducedMotion ? "demand" : "always";
  return (
    <Canvas
      className="!absolute inset-0"
      style={{ touchAction: "none" }}
      frameloop={frameloop}
      dpr={low ? [1, 1.25] : [1, 1.9]}
      shadows={!low}
      camera={{ position: [4.0, 2.6, 5.6], fov: 32 }}
      gl={{ antialias: !low, alpha: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#07080b"]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 7, 4]} intensity={2.6} castShadow={!low} />
      <directionalLight position={[-6, 3, -4]} intensity={1.2} color="#cfd6e4" />
      <pointLight position={[0, 1.6, 0]} intensity={1.1} color={ACCENT} distance={5} />
      <Suspense fallback={null}>
        <Rig {...props} />
        {!low ? <Environment preset="warehouse" environmentIntensity={0.55} /> : null}
        <ContactShadows
          position={[0, -0.9, 0]}
          opacity={0.5}
          scale={11}
          blur={2.6}
          far={4}
          resolution={low ? 256 : 512}
        />
      </Suspense>
      <OrbitControls
        ref={controlsRef as never}
        makeDefault
        enablePan={false}
        enableZoom={zoom}
        enableDamping
        dampingFactor={coarse ? 0.12 : 0.08}
        rotateSpeed={coarse ? 0.55 : 0.9}
        zoomSpeed={coarse ? 0.5 : 0.8}
        minDistance={3.4}
        maxDistance={9}
        autoRotate={reducedMotion ? false : (autoRotate ?? false)}
        autoRotateSpeed={0.5}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={Math.PI / 2.05}
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE }}
      />
    </Canvas>
  );
}
