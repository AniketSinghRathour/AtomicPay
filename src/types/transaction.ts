export interface Transaction {
  id: string;
  type: "user" | "wallet";
  initials?: string;
  avatarBg?: string;
  avatarText?: string;
  party: string;
  partyEmail?: string;
  subtext: string;
  time: string;
  amount: number; // positive for incoming, negative for outgoing
  rawAmount?: number;
  status: "Committed" | "Pending";
  txnId: string;
  note?: string;
  fromWalletId?: string;
  toWalletId?: string;
}

export interface PaymentRequestItem {
  id: string;
  party: string;
  partyEmail: string;
  initials: string;
  isIncoming: boolean;
  amount: number;
  message?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}
