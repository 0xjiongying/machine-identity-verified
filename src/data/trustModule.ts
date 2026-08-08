/**
 * Machine Asset Core — the hero object.
 *
 * A modular industrial core bonded to the physical machine: four engineered
 * component modules (motor, controller, arm, safety system) around a signing
 * spine. Every value below is clearly labelled DEMO DATA for the prototype.
 */

export type ModuleKey = "motor" | "controller" | "arm" | "safety";

export type ModulePart = {
  key: ModuleKey;
  index: string;
  /** Hotspot caption — short, uppercase in UI. */
  name: string;
  partId: string;
  serial: string;
  summary: string;
  specs: { label: string; value: string }[];
  /** Provenance line shown on the instrument panel. */
  provenance: { label: string; value: string }[];
  /** Which passport surface this module backs. */
  passport: string;
};

export const moduleParts: ModulePart[] = [
  {
    key: "motor",
    index: "M-01",
    name: "Motor",
    partId: "AXS-M2-77140",
    serial: "SN 77140-DEMO",
    summary:
      "Axis-2 drive unit. The 2026 replacement is recorded as a parts-lineage event on the passport.",
    specs: [
      { label: "Rated power (demo)", value: "7.5 kW" },
      { label: "Duty", value: "Axis 2 shoulder drive" },
      { label: "Runtime (demo)", value: "11,240 h" },
      { label: "Condition", value: "Nominal" },
    ],
    provenance: [
      { label: "Manufactured (demo)", value: "2025-11-02 · Västerås" },
      { label: "Installed (demo)", value: "2026-02-04" },
      { label: "Lineage", value: "1 replacement · original retired" },
      { label: "Signed by", value: "Machine Trust core key" },
    ],
    passport: "Parts lineage entry",
  },
  {
    key: "controller",
    index: "M-02",
    name: "Controller",
    partId: "IRC5-3HAC-0421",
    serial: "SN 30421-DEMO",
    summary:
      "Signs machine state and pushes verified telemetry into the Machine Passport before anchoring.",
    specs: [
      { label: "Firmware", value: "6.14 · signed" },
      { label: "Signing key", value: "secp256k1 · sealed" },
      { label: "Records anchored (demo)", value: "47" },
      { label: "Clock", value: "Attested" },
    ],
    provenance: [
      { label: "Commissioned (demo)", value: "2025-03-11" },
      { label: "Last service (demo)", value: "2026-06-18" },
      { label: "Key rotations", value: "0" },
      { label: "Anchor", value: "Monad · demo network" },
    ],
    passport: "Identity root + telemetry",
  },
  {
    key: "arm",
    index: "M-03",
    name: "Arm",
    partId: "IRB6700-ARM-8802",
    serial: "SN 88021-DEMO",
    summary:
      "Articulated payload assembly. Calibration state is part of the asset's compliance surface.",
    specs: [
      { label: "Reach (demo)", value: "2.60 m" },
      { label: "Payload (demo)", value: "150 kg" },
      { label: "Joints", value: "3 monitored" },
      { label: "Calibrated (demo)", value: "2026-01-22" },
    ],
    provenance: [
      { label: "Installed (demo)", value: "2025-03-11" },
      { label: "Recalibrations", value: "2 · both signed" },
      { label: "Collision events", value: "0" },
      { label: "Maintenance file", value: "8 records" },
    ],
    passport: "Maintenance record",
  },
  {
    key: "safety",
    index: "M-04",
    name: "Safety system",
    partId: "SF-GUARD-2210",
    serial: "SN 22101-DEMO",
    summary:
      "Independent guard and interlock chain. A lapsed safety audit blocks issuance and transfer at policy level.",
    specs: [
      { label: "Interlocks", value: "2 × mechanical" },
      { label: "E-stop channels", value: "Dual, monitored" },
      { label: "Audit (demo)", value: "2025-09-04" },
      { label: "Policy weight", value: "Blocking" },
    ],
    provenance: [
      { label: "Inspector (demo)", value: "Independent · TR-118" },
      { label: "Next audit due (demo)", value: "2026-09-04" },
      { label: "Tamper events", value: "0" },
      { label: "Bond", value: "Permanent — removal voids passport" },
    ],
    passport: "Compliance precondition",
  },
];

/** Signature motion sequence mapped onto the RWA story. */
export type StageId =
  | "compact"
  | "wake"
  | "unfold"
  | "assemble"
  | "scan"
  | "inspect"
  | "verify"
  | "tokenize"
  | "ready";

export type Stage = {
  id: StageId;
  /** Short uppercase label used on the rail and in the 3D HUD. */
  label: string;
  /** Who owns this step. */
  owner: "Machine Trust" | "Cleanverse" | "Monad";
  detail: string;
  /** Instrument-panel card lit at this stage. */
  target: string;
};

export const verifySteps: Stage[] = [
  {
    id: "compact",
    label: "Compact / coiled",
    owner: "Machine Trust",
    detail: "Physical machine at rest — coiled asset core before wake.",
    target: "core",
  },
  {
    id: "wake",
    label: "Wake",
    owner: "Machine Trust",
    detail: "Core powers on and addresses every module serial.",
    target: "core",
  },
  {
    id: "unfold",
    label: "Unfold",
    owner: "Machine Trust",
    detail: "Motor, controller, arm and safety modules deploy for inspection.",
    target: "core",
  },
  {
    id: "assemble",
    label: "Assemble",
    owner: "Machine Trust",
    detail: "Modules lock into one machine form — ready for passport binding.",
    target: "passport",
  },
  {
    id: "scan",
    label: "Scan",
    owner: "Machine Trust",
    detail: "Wireframe scan hashes physical state into the Machine Passport.",
    target: "passport",
  },
  {
    id: "inspect",
    label: "Inspect",
    owner: "Machine Trust",
    detail: "Hotspots: Motor · Controller · Arm · Safety System.",
    target: "passport",
  },
  {
    id: "verify",
    label: "Verify · CVI",
    owner: "Cleanverse",
    detail: "Issuer identity resolved against the Cleanverse A-Pass registry.",
    target: "cvi",
  },
  {
    id: "tokenize",
    label: "Tokenize · CVA",
    owner: "Cleanverse",
    detail: "Passport bound to a registered A-Token — the compliant asset layer.",
    target: "cva",
  },
  {
    id: "ready",
    label: "Ready for transfer",
    owner: "Monad",
    detail:
      "CCP cleared. Demo settlement reference after approval — not a fabricated explorer hash.",
    target: "ccp",
  },
];

/** Instrument panels beside the core. Values change with the stage. */
export type Instrument = {
  key: "passport" | "cvi" | "cva" | "ccp";
  label: string;
  /** Stage index at which this panel goes live. */
  at: number;
  pending: { value: string; state: string };
  live: { value: string; state: string };
};

export const dataCards: Instrument[] = [
  {
    key: "passport",
    label: "Machine Passport",
    at: 3,
    pending: { value: "Not built", state: "Awaiting scan" },
    live: { value: "MT-2048 (demo)", state: "4 modules bound" },
  },
  {
    key: "cvi",
    label: "CVI · A-Pass",
    at: 6,
    pending: { value: "Unresolved", state: "Issuer unknown" },
    live: { value: "A-Pass · demo sequence", state: "Illustrative" },
  },
  {
    key: "cva",
    label: "CVA · A-Token",
    at: 7,
    pending: { value: "Not bound", state: "Blocked" },
    live: { value: "aUSDC bind (demo sequence)", state: "Illustrative" },
  },
  {
    key: "ccp",
    label: "CCP pre-transaction",
    at: 8,
    pending: { value: "Not evaluated", state: "Pending" },
    live: { value: "Demo sequence", state: "Illustrative" },
  },
];

export const onChain = {
  title: "Ready for transfer",
  id: "MT-2048 (demo)",
  network: "Monad · settlement ref (DEMO)",
  contract: "MachineTrustRegistry.sol · NOT DEPLOYED",
  address: "Deploy Testnet before claiming Mainnet",
  records: "Passport events · DEMO metadata",
} as const;

/** Identity revealed when the controller module is selected. DEMO DATA. */
export const machineIdentity = {
  title: "Machine identity",
  id: "MT-2048 (demo)",
  did: "did:cvi:monad:0x8F41…A42C",
  fields: [
    { label: "Machine serial", value: "IRB6700-2048 (demo)" },
    { label: "Core key", value: "secp256k1 · sealed" },
    { label: "Identity issuer", value: "Cleanverse CVI" },
    { label: "Bound (demo)", value: "2026-02-14" },
    { label: "Attestations", value: "4 valid (demo)" },
    { label: "Anchor", value: "Monad · demo network" },
  ],
} as const;
