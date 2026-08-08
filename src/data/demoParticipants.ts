/** DEMO DATA — participants bound to sandbox-registered Cleanverse A-Pass wallets. */

import { SANDBOX_WALLETS } from "./cleanverse-registry";

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
  wallet: SANDBOX_WALLETS.issuer,
  cvi: true,
  jurisdiction: "DE",
  note: "Verified industrial operator (sandbox A-Pass)",
};

export const recipients: Participant[] = [
  {
    key: "unknown",
    name: "Unknown Wallet",
    role: "RECIPIENT A",
    wallet: SANDBOX_WALLETS.unknown,
    cvi: false,
    jurisdiction: "—",
    note: "No Cleanverse identity credential presented",
  },
  {
    key: "fundb",
    name: "Equipment Fund B",
    role: "RECIPIENT B",
    wallet: SANDBOX_WALLETS.fund,
    cvi: true,
    jurisdiction: "LU",
    note: "Verified institutional asset holder (sandbox A-Pass)",
  },
];
