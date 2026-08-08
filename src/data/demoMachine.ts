/**
 * Canonical demo machine for the Machine Trust prototype.
 * DEMO DATA — not sourced from a production system.
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
  status: "ACTIVE" as const,
  currentOwner: "Equipment Fund B",
  provenanceEvents: 17,
};

export const ownershipHistory = [
  {
    year: "2025",
    entity: "ABC Manufacturing",
    action: "Initial registration",
    ref: "mt:reg/0x4a1c…9f02",
    verified: true,
  },
  {
    year: "2026",
    entity: "Equipment Fund B",
    action: "Compliant transfer",
    ref: "monad:tx/0x8b73…c410",
    verified: true,
  },
  {
    year: "Current",
    entity: "Equipment Fund B",
    action: "Active ownership",
    ref: "state:owner",
    verified: true,
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

export const auditTrail = [
  {
    time: "2025-03-11 09:14 UTC",
    entity: "ABC Manufacturing",
    action: "Machine registered",
    verification: "Passport issued",
    tx: "mt:reg/0x4a1c…9f02",
  },
  {
    time: "2026-06-02 13:40 UTC",
    entity: "ABB Service 11",
    action: "Maintenance completed",
    verification: "Signed service record",
    tx: "mt:svc/0x1d55…77ab",
  },
  {
    time: "2026-08-04 10:02 UTC",
    entity: "ABC Manufacturing",
    action: "RWA issued",
    verification: "CVI + CVA pass",
    tx: "monad:tx/0x2f90…be31",
  },
  {
    time: "2026-08-08 08:26 UTC",
    entity: "ABC Manufacturing → Equipment Fund B",
    action: "Compliant transfer",
    verification: "Policy pass",
    tx: "monad:tx/0x8b73…c410",
  },
  {
    time: "Current",
    entity: "Equipment Fund B",
    action: "Ownership active",
    verification: "On-chain state",
    tx: "state:owner",
  },
];
