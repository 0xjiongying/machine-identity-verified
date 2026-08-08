/**
 * Canonical demo machine for the Machine Trust prototype.
 * DEMO DATA — physical/passport metadata only.
 * Ownership, issuance, and transfer claims come from live asset state
 * after real Cleanverse gates succeed — never pre-settled here.
 */

export const demoMachine = {
  id: "MT-000042",
  index: "MACHINE 042",
  model: "ABB IRB 6700",
  serial: "IRB6700-92831",
  manufacturer: "ABB",
  category: "Industrial articulated robot",
  commissioned: "2025-03-11",
  location: "Plant 2 — Cell 14",
  valuation: "$120,000",
  status: "PASSPORT_READY" as const,
  /** Initial owner before any Cleanverse-gated transfer. */
  currentOwner: "ABC Manufacturing",
  provenanceEvents: 2,
};

/**
 * Passport-only ownership seed. Compliant transfers are appended from
 * `useAssetState` after CCP approval — never invent a settled Fund B transfer.
 */
export const ownershipHistory = [
  {
    year: "2025",
    entity: "ABC Manufacturing",
    action: "Initial registration",
    ref: "mt:reg/demo-passport",
    verified: false,
  },
  {
    year: "Current",
    entity: "ABC Manufacturing",
    action: "Active ownership · awaiting RWA issuance",
    ref: "state:owner",
    verified: false,
  },
];

export const maintenanceLog = [
  { date: "Aug 2026", work: "Motor inspection", tech: "ABB Service 04", result: "PASS" },
  { date: "Jun 2026", work: "Controller service", tech: "ABB Service 11", result: "PASS" },
  { date: "Jan 2026", work: "Arm calibration", tech: "In-house / L2", result: "PASS" },
  { date: "Sep 2025", work: "Safety system audit", tech: "Independent inspector", result: "PASS" },
];

export type MachinePart = {
  key: string;
  name: string;
  partId: string;
  installed: string;
  manufacturer: string;
  maintenance: string;
  replacements: string;
};

export const machineParts: MachinePart[] = [
  {
    key: "controller",
    name: "Controller",
    partId: "IRC5-3HAC-0421",
    installed: "2025-03-11",
    manufacturer: "ABB",
    maintenance: "Serviced Jun 2026",
    replacements: "None",
  },
  {
    key: "motor",
    name: "Motor",
    partId: "AXS-M2-77140",
    installed: "2026-02-04",
    manufacturer: "ABB",
    maintenance: "Inspected Aug 2026",
    replacements: "1 — original unit retired 2026-02",
  },
  {
    key: "arm",
    name: "Arm assembly",
    partId: "IRB6700-ARM-8802",
    installed: "2025-03-11",
    manufacturer: "ABB",
    maintenance: "Calibrated Jan 2026",
    replacements: "None",
  },
  {
    key: "safety",
    name: "Safety system",
    partId: "SF-GUARD-2210",
    installed: "2025-03-11",
    manufacturer: "Safety module vendor",
    maintenance: "Audited Sep 2025",
    replacements: "None",
  },
];

/**
 * Base audit trail — Machine Trust passport events only.
 * Issuance / transfer rows appear only after real Cleanverse decisions
 * via `extraEvents` in asset state.
 */
export const auditTrail = [
  {
    time: "2025-03-11 09:14 UTC",
    entity: "ABC Manufacturing",
    action: "Machine registered",
    verification: "Passport (demo metadata)",
    tx: "mt:reg/demo-passport",
  },
  {
    time: "2026-06-02 13:40 UTC",
    entity: "ABB Service 11",
    action: "Maintenance completed",
    verification: "Signed service record (demo)",
    tx: "mt:svc/demo-maintenance",
  },
];
