/**
 * Inspectable components of the canonical demo machine.
 * DEMO DATA — illustrative values for the prototype, not a production record.
 */

export type ComponentKey = "controller" | "motor" | "arm" | "safety";

export type MachineComponent = {
  key: ComponentKey;
  index: string;
  name: string;
  partId: string;
  /** Anchor position in model space for the 3D hotspot. */
  anchor: [number, number, number];
  /** Direction the part travels in the exploded view. */
  offset: [number, number, number];
  summary: string;
  specs: { label: string; value: string }[];
  passport: string;
};

export const machineComponents: MachineComponent[] = [
  {
    key: "controller",
    index: "C-01",
    name: "Controller",
    partId: "IRC5-3HAC-0421",
    anchor: [0, 0.62, 0.75],
    offset: [0, -0.55, 0],
    summary: "Signs machine state and pushes verified telemetry into the passport.",
    specs: [
      { label: "Installed", value: "2025-03-11" },
      { label: "Firmware", value: "6.14 (signed)" },
      { label: "Last service", value: "Jun 2026" },
      { label: "Replacements", value: "None" },
    ],
    passport: "Ownership + telemetry root",
  },
  {
    key: "motor",
    index: "C-02",
    name: "Axis motor",
    partId: "AXS-M2-77140",
    anchor: [-0.62, 1.16, 0.5],
    offset: [-0.5, 0.15, 0.35],
    summary: "Replaced unit — the swap is recorded as a parts-lineage event.",
    specs: [
      { label: "Installed", value: "2026-02-04" },
      { label: "Duty", value: "Axis 2 shoulder drive" },
      { label: "Last inspection", value: "Aug 2026" },
      { label: "Replacements", value: "1 — original retired 2026-02" },
    ],
    passport: "Parts lineage entry",
  },
  {
    key: "arm",
    index: "C-03",
    name: "Arm assembly",
    partId: "IRB6700-ARM-8802",
    anchor: [1.5, 2.9, 0.4],
    offset: [0.75, 0.75, -0.3],
    summary: "Calibration state is part of the asset's compliance surface.",
    specs: [
      { label: "Installed", value: "2025-03-11" },
      { label: "Reach", value: "2.60 m" },
      { label: "Calibrated", value: "Jan 2026" },
      { label: "Replacements", value: "None" },
    ],
    passport: "Maintenance record",
  },
  {
    key: "safety",
    index: "C-04",
    name: "Safety system",
    partId: "SF-GUARD-2210",
    anchor: [1.85, 0.3, 0.3],
    offset: [0, -0.15, 0],
    summary: "An expired safety audit blocks issuance and transfer at policy level.",
    specs: [
      { label: "Installed", value: "2025-03-11" },
      { label: "Audit", value: "Independent inspector" },
      { label: "Audited", value: "Sep 2025" },
      { label: "Policy weight", value: "Blocking" },
    ],
    passport: "Compliance precondition",
  },
];
