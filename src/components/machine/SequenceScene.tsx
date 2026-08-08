import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { damp } from "@/lib/motion";
import { machineComponents, type ComponentKey } from "@/data/machineComponents";

const ACCENT = "#836ef9";

export type SequenceProps = {
  /** 0..1 sequence position: coil → unfold → activate → move → recoil. */
  progress: number;
  /** When true the scene runs its own loop clock instead of the scroll value. */
  auto: boolean;
  hovered: ComponentKey | null;
  selected: ComponentKey | null;
  tier?: "high" | "reduced";
  onHover: (k: ComponentKey | null) => void;
  onSelect: (k: ComponentKey | null) => void;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const ramp = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
/** Heavy mechanical ease — slow start, long settle. */
const mech = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Joint pose for a given sequence position. */
function pose(p: number, time: number) {
  const unfold = mech(ramp(p, 0.14, 0.5));
  const recoil = mech(ramp(p, 0.9, 1));
  const open = unfold * (1 - recoil);
  const run = ramp(p, 0.62, 0.9) * (1 - recoil);
  const live = ramp(p, 0.5, 0.62) * (1 - recoil);

  // coiled → extended joint targets, plus the working cycle once activated.
  const cycle = time * 0.55;
  const shoulder = -2.2 + open * 1.72 + run * Math.sin(cycle) * 0.34;
  const elbow = 2.6 - open * 1.5 + run * Math.sin(cycle * 1.6 + 0.9) * 0.4;
  const wrist = -0.6 + open * 0.15 + run * Math.sin(cycle * 2.1) * 0.5;
  const yaw = run * Math.sin(cycle * 0.7) * 0.95;
  const lift = open * 0.18;

  return { shoulder, elbow, wrist, yaw, lift, open, run, live };
}

function Steel({ tone = "#6b7080", rough = 0.28 }: { tone?: string; rough?: number }) {
  return (
    <meshStandardMaterial
      color={tone}
      metalness={0.72}
      roughness={rough}
      transparent
      emissive={new THREE.Color(ACCENT)}
      emissiveIntensity={0.015}
    />
  );
}

/** Selectable region: emissive highlight, dimming of everything else. */
function Region({
  id,
  hovered,
  selected,
  live,
  onHover,
  onSelect,
  children,
}: {
  id: ComponentKey;
  hovered: ComponentKey | null;
  selected: ComponentKey | null;
  live: number;
  onHover: (k: ComponentKey | null) => void;
  onSelect: (k: ComponentKey | null) => void;
  children: React.ReactNode;
}) {
  const g = useRef<THREE.Group>(null);
  const active = hovered === id || selected === id;
  const muted = selected !== null && selected !== id;

  useFrame((_, dt) => {
    const node = g.current;
    if (!node) return;
    node.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (!mat || !("emissiveIntensity" in mat)) return;
      mat.emissiveIntensity = damp(
        mat.emissiveIntensity ?? 0,
        active ? 0.36 : 0.02 + live * 0.1,
        7,
        dt,
      );
      mat.opacity = damp(mat.opacity ?? 1, muted ? 0.38 : 1, 7, dt);
      mat.transparent = true;
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

/** Thin ring that sweeps the machine while it powers up. */
function ScanRing({ live }: { live: number }) {
  const m = useRef<THREE.Mesh>(null);
  useFrame((state, dt) => {
    const node = m.current;
    if (!node) return;
    const t = (state.clock.elapsedTime * 0.32) % 1;
    node.position.y = t * 3.8;
    const mat = node.material as THREE.MeshBasicMaterial;
    mat.opacity = damp(mat.opacity, live * 0.4 * Math.sin(t * Math.PI), 8, dt);
  });
  return (
    <mesh ref={m} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.62, 1.86, 128]} />
      <meshBasicMaterial color={ACCENT} transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** Ambient technical motes drifting in the work envelope. */
function Motes({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 1 + Math.random() * 2.6;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = Math.random() * 4;
      arr[i * 3 + 2] = Math.sin(a) * r;
    }
    return arr;
  }, [count]);
  useFrame((state, dt) => {
    const p = ref.current;
    if (!p) return;
    p.rotation.y += dt * 0.05;
    p.position.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.06;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.02} color={ACCENT} transparent opacity={0.35} sizeAttenuation />
    </points>
  );
}

/** Wireframe twin of the arm silhouette — the technical overlay. */
function WireOverlay({ opacity }: { opacity: number }) {
  return (
    <mesh scale={1.012}>
      <boxGeometry args={[0.44, 1.74, 0.52]} />
      <meshBasicMaterial wireframe color={ACCENT} transparent opacity={opacity} />
    </mesh>
  );
}

function Machine(props: SequenceProps) {
  const { hovered, selected, onHover, onSelect } = props;
  const yawG = useRef<THREE.Group>(null);
  const shoulderG = useRef<THREE.Group>(null);
  const elbowG = useRef<THREE.Group>(null);
  const wristG = useRef<THREE.Group>(null);
  const root = useRef<THREE.Group>(null);
  const state = useRef({ live: 0, wire: 0 });

  useFrame((s, dt) => {
    const p = props.auto ? (s.clock.elapsedTime * 0.075) % 1 : clamp01(props.progress);
    const t = pose(p, s.clock.elapsedTime);

    // Inertia: joints chase their targets instead of snapping to them.
    if (yawG.current) yawG.current.rotation.y = damp(yawG.current.rotation.y, t.yaw, 2.2, dt);
    if (shoulderG.current)
      shoulderG.current.rotation.z = damp(shoulderG.current.rotation.z, t.shoulder, 2.6, dt);
    if (elbowG.current)
      elbowG.current.rotation.z = damp(elbowG.current.rotation.z, t.elbow, 2.9, dt);
    if (wristG.current)
      wristG.current.rotation.z = damp(wristG.current.rotation.z, t.wrist, 3.4, dt);
    if (root.current) root.current.position.y = damp(root.current.position.y, -1.1 + t.lift, 3, dt);

    state.current.live = damp(state.current.live, t.live, 4, dt);
    state.current.wire = damp(state.current.wire, 0.1 + t.open * 0.35, 4, dt);
  });

  const live = state.current.live;

  return (
    <group ref={root} position={[0, -1.1, 0]} scale={0.62}>
      {/* base + column — controller */}
      <Region
        id="controller"
        hovered={hovered}
        selected={selected}
        live={live}
        onHover={onHover}
        onSelect={onSelect}
      >
        <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.05, 1.3, 0.24, 48]} />
          <Steel tone="#5c6170" />
        </mesh>
        <mesh position={[0, 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.6, 0.74, 0.78, 40]} />
          <Steel />
        </mesh>
      </Region>

      <group ref={yawG}>
        {/* shoulder drive — motor */}
        <Region
          id="motor"
          hovered={hovered}
          selected={selected}
          live={live}
          onHover={onHover}
          onSelect={onSelect}
        >
          <mesh position={[0, 1.12, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.42, 0.42, 1.02, 36]} />
            <Steel tone="#787e8c" rough={0.26} />
          </mesh>
          <mesh position={[0, 1.12, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.44, 0.03, 10, 48]} />
            <Steel tone="#878e9e" />
          </mesh>
        </Region>

        {/* jointed arm — kinematic chain */}
        <group position={[0, 1.12, 0]}>
          <group ref={shoulderG}>
            <Region
              id="arm"
              hovered={hovered}
              selected={selected}
              live={live}
              onHover={onHover}
              onSelect={onSelect}
            >
              <mesh position={[0, 0.85, 0]} castShadow>
                <boxGeometry args={[0.42, 1.7, 0.5]} />
                <Steel />
              </mesh>
              <group position={[0, 1.7, 0]}>
                <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.26, 0.26, 0.56, 28]} />
                  <Steel tone="#7b8290" rough={0.24} />
                </mesh>
                <group ref={elbowG}>
                  <mesh position={[0, 0.75, 0]} castShadow>
                    <boxGeometry args={[0.32, 1.5, 0.38]} />
                    <Steel />
                  </mesh>
                  <group ref={wristG} position={[0, 1.5, 0]}>
                    <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                      <cylinderGeometry args={[0.2, 0.2, 0.42, 24]} />
                      <Steel tone="#878e9e" rough={0.2} />
                    </mesh>
                    <mesh position={[0, 0.3, 0]} castShadow>
                      <boxGeometry args={[0.18, 0.4, 0.18]} />
                      <Steel tone="#98a0b0" />
                    </mesh>
                  </group>
                  <group position={[0, 0.75, 0]}>
                    <WireOverlay opacity={state.current.wire * 0.5} />
                  </group>
                </group>
              </group>
              <group position={[0, 0.85, 0]}>
                <WireOverlay opacity={state.current.wire * 0.5} />
              </group>
            </Region>
          </group>
        </group>
      </group>

      {/* safety envelope */}
      <Region
        id="safety"
        hovered={hovered}
        selected={selected}
        live={live}
        onHover={onHover}
        onSelect={onSelect}
      >
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.9, 0.028, 10, 128]} />
          <Steel tone="#565b66" rough={0.5} />
        </mesh>
        <mesh position={[0, 0.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.9, 0.02, 10, 128]} />
          <Steel tone="#565b66" rough={0.5} />
        </mesh>
      </Region>

      <ScanRing live={live} />
      <Motes count={props.tier === "reduced" ? 90 : 300} />
      <gridHelper args={[9, 18, "#2a2c33", "#1a1c21"]} />
    </group>
  );
}

export default function SequenceScene(props: SequenceProps) {
  const reduced = props.tier === "reduced";
  return (
    <Canvas
      shadows={!reduced}
      dpr={reduced ? 1 : [1, 1.6]}
      camera={{ position: [4.4, 1.9, 7.4], fov: 34 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onPointerMissed={() => props.onSelect(null)}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <ambientLight intensity={0.55} />
      <Environment preset="warehouse" />
      <directionalLight
        position={[5, 9, 5]}
        intensity={5.2}
        color="#e6eaf2"
        castShadow={!reduced}
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-6, 3, -4]} intensity={0.18} color={ACCENT} />
      <directionalLight position={[0, 2, 8]} intensity={2.4} color="#cfd6e6" />
      <hemisphereLight args={["#c8d2e4", "#14161c", 0.6]} />
      <Suspense fallback={null}>
        <Machine {...props} />
        {reduced ? null : (
          <ContactShadows
            position={[0, -1.1, 0]}
            opacity={0.5}
            scale={12}
            blur={2.6}
            far={5}
            color="#000000"
          />
        )}
      </Suspense>
      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={false}
        minPolarAngle={0.45}
        maxPolarAngle={Math.PI / 2.05}
        enableDamping
        dampingFactor={0.07}
        rotateSpeed={0.6}
        target={[0, 0.5, 0]}
      />
    </Canvas>
  );
}