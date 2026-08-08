/**
 * DEMO REGISTRY — locally held Cleanverse credential fixtures.
 *
 * These are NOT responses from Cleanverse. They are the inputs the demo policy
 * engine evaluates, shaped to CVI / CVA credential semantics so the same UI can
 * render credentials returned by a live Cleanverse deployment unchanged.
 */

export type CredentialStatus = "active" | "revoked" | "expired" | "absent";

export type CviCredential = {
  schema: "cleanverse:cvi:v1";
  id: string;
  type: "CleanverseVerifiedIdentity";
  holder: { name: string; role: string; wallet: string; did: string };
  status: CredentialStatus;
  kycTier: 0 | 1 | 2 | 3;
  accreditation: "institutional" | "operator" | "none";
  jurisdiction: string;
  issuedAt: string;
  expiresAt: string;
  proof: { type: string; verificationMethod: string };
};

export type AssetAttestation = {
  code: string;
  label: string;
  attestor: string;
  validUntil: string;
  status: "valid" | "expired";
};

export type CvaCredential = {
  schema: "cleanverse:cva:v1";
  id: string;
  type: "CleanverseVerifiedAsset";
  subject: { passportId: string; serial: string; assetClass: string };
  status: "active" | "suspended";
  transferable: boolean;
  attestations: AssetAttestation[];
  restrictions: {
    allowedJurisdictions: string[];
    minKycTier: number;
    allowedAccreditation: Array<CviCredential["accreditation"]>;
  };
  proof: { type: string; verificationMethod: string };
};

const PROOF = {
  type: "Ed25519Signature2020",
  verificationMethod: "did:cleanverse:registry#keys-1",
};

export const cviIssuer: CviCredential = {
  schema: "cleanverse:cvi:v1",
  id: "cvi:cred/8f21-4ab0-issuer",
  type: "CleanverseVerifiedIdentity",
  holder: {
    name: "ABC Manufacturing",
    role: "Issuer / operator",
    wallet: "0x4a1c…9f02",
    did: "did:cleanverse:holder:abc-mfg",
  },
  status: "active",
  kycTier: 3,
  accreditation: "operator",
  jurisdiction: "DE",
  issuedAt: "2025-01-20",
  expiresAt: "2027-01-20",
  proof: PROOF,
};

export const cviUnknown: CviCredential = {
  schema: "cleanverse:cvi:v1",
  id: "cvi:cred/none",
  type: "CleanverseVerifiedIdentity",
  holder: {
    name: "Unknown Wallet",
    role: "Counterparty A",
    wallet: "0xd7f2…31c8",
    did: "—",
  },
  status: "absent",
  kycTier: 0,
  accreditation: "none",
  jurisdiction: "—",
  issuedAt: "—",
  expiresAt: "—",
  proof: { type: "—", verificationMethod: "—" },
};

export const cviFund: CviCredential = {
  schema: "cleanverse:cvi:v1",
  id: "cvi:cred/2c74-9de1-fundb",
  type: "CleanverseVerifiedIdentity",
  holder: {
    name: "Equipment Fund B",
    role: "Institutional buyer",
    wallet: "0x8b73…c410",
    did: "did:cleanverse:holder:equipment-fund-b",
  },
  status: "active",
  kycTier: 3,
  accreditation: "institutional",
  jurisdiction: "LU",
  issuedAt: "2025-09-02",
  expiresAt: "2027-09-02",
  proof: PROOF,
};

export const cvaMachine: CvaCredential = {
  schema: "cleanverse:cva:v1",
  id: "cva:cred/MT-000042",
  type: "CleanverseVerifiedAsset",
  subject: {
    passportId: "MT-000042",
    serial: "IRB6700-92831",
    assetClass: "industrial-equipment/articulated-robot",
  },
  status: "active",
  transferable: true,
  attestations: [
    {
      code: "ATT-SAFETY",
      label: "Safety system audit",
      attestor: "Independent inspector",
      validUntil: "2026-09-30",
      status: "valid",
    },
    {
      code: "ATT-CALIB",
      label: "Arm calibration record",
      attestor: "ABB Service 11",
      validUntil: "2027-01-15",
      status: "valid",
    },
    {
      code: "ATT-TITLE",
      label: "Title / lien check",
      attestor: "Registry of movable assets",
      validUntil: "2027-03-11",
      status: "valid",
    },
  ],
  restrictions: {
    allowedJurisdictions: ["DE", "LU", "NL", "FR", "SE"],
    minKycTier: 2,
    allowedAccreditation: ["institutional", "operator"],
  },
  proof: PROOF,
};

export const counterparties: CviCredential[] = [cviUnknown, cviFund];