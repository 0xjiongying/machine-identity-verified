/**
 * Machine Trust module — the physical machine identity / security module used as
 * the hero object. DEMO DATA: illustrative values for the prototype.
 */

export type ModuleKey = "chip" | "enclosure" | "board" | "mechanics";

export type ModulePart = {
  key: ModuleKey;
  index: string;
  name: string;
  partId: string;
  summary: string;
  specs: { label: string; value: string }[];
  /** Which passport surface this part backs. */
  passport: string;
};

export const moduleParts: ModulePart[] = [
  {
    key: "chip",
    index: "M-01",
    name: "Trust chip",
    partId: "MT-SE-2048",
    summary: "Secure element holding the machine's cryptographic identity key pair.",
    specs: [
      { label: "Key", value: "secp256k1 · sealed" },
      { label: "Attested", value: "Cleanverse CVI" },
      { label: "Anchor", value: "Monad mainnet" },
    ],
    passport: "Identity root",
  },
  {
    key: "enclosure",
    index: "M-02",
    name: "Tamper enclosure",
    partId: "MT-ENC-04",
    summary: "Transparent protective shell — any opening event is signed and logged.",
    specs: [
      { label: "Seal", value: "Intact" },
      { label: "Events", value: "0 breaches" },
      { label: "Rating", value: "IP67 / IK08" },
    ],
    passport: "Tamper log",
  },
  {
    key: "board",
    index: "M-03",
    name: "Verification board",
    partId: "MT-VB-118",
    summary: "Signs telemetry, provenance and maintenance records before anchoring.",
    specs: [
      { label: "Firmware", value: "2.4.1 (signed)" },
      { label: "Throughput", value: "1.2k sig/s" },
      { label: "Records", value: "47 anchored" },
    ],
    passport: "Record anchoring",
  },
  {
    key: "mechanics",
    index: "M-04",
    name: "Mount & interlocks",
    partId: "MT-MNT-09",
    summary: "Bonds the module to the physical asset — removal invalidates the passport.",
    specs: [
      { label: "Bond", value: "Permanent" },
      { label: "Interlocks", value: "2 × mechanical" },
      { label: "Torque log", value: "Signed" },
    ],
    passport: "Asset binding",
  },
];

export type DataCard = {
  key: ModuleKey | "provenance" | "maintenance" | "parts" | "id";
  label: string;
  value: string;
  state: string;
};

export const dataCards: DataCard[] = [
  { key: "id", label: "Machine ID", value: "MT-2048", state: "Verified" },
  { key: "provenance", label: "Provenance", value: "47 records", state: "Immutable" },
  { key: "maintenance", label: "Maintenance", value: "08 records", state: "Verified" },
  { key: "parts", label: "Parts", value: "12 verified", state: "Verified" },
];

/** Laser verification sequence — the hero's core interaction metaphor. */
export const verifySteps = [
  { id: "scan", label: "Scanning machine", target: "module" },
  { id: "identity", label: "Verifying identity", target: "id" },
  { id: "provenance", label: "Verifying provenance", target: "provenance" },
  { id: "parts", label: "Verifying parts", target: "parts" },
  { id: "maintenance", label: "Verifying maintenance", target: "maintenance" },
  { id: "done", label: "Verified on Monad", target: "module" },
] as const;

export const onChain = {
  title: "Machine Trust verified",
  id: "MT-2048",
  network: "Monad mainnet",
  contract: "RoboticsPassport.sol",
  address: "0x8F...A42C",
  records: "47 on-chain records",
} as const;

/** Identity revealed when the trust chip is selected. DEMO DATA. */
export const machineIdentity = {
  title: "Machine identity",
  id: "MT-2048",
  did: "did:cvi:monad:0x8F41…A42C",
  fields: [
    { label: "Serial", value: "IRB6700-2048" },
    { label: "Key", value: "secp256k1 · sealed" },
    { label: "Issuer", value: "Cleanverse CVI" },
    { label: "Bound", value: "2026-02-14" },
    { label: "Attestations", value: "4 valid" },
    { label: "Anchor", value: "Monad mainnet" },
  ],
} as const;
