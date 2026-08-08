/** DEMO DATA — simulated Cleanverse participants. */

export type Participant = {
  key: string;
  name: string;
  role: string;
  wallet: string;
  cvi: boolean;
  jurisdiction: string;
  note: string;
};

export const issuer: Participant = {
  key: "abc",
  name: "ABC Manufacturing",
  role: "ISSUER",
  wallet: "0x4a1c…9f02",
  cvi: true,
  jurisdiction: "DE",
  note: "Verified industrial operator",
};

export const recipients: Participant[] = [
  {
    key: "unknown",
    name: "Unknown Wallet",
    role: "RECIPIENT A",
    wallet: "0xd7f2…31c8",
    cvi: false,
    jurisdiction: "—",
    note: "No Cleanverse identity credential presented",
  },
  {
    key: "fundb",
    name: "Equipment Fund B",
    role: "RECIPIENT B",
    wallet: "0x8b73…c410",
    cvi: true,
    jurisdiction: "LU",
    note: "Verified institutional asset holder",
  },
];
