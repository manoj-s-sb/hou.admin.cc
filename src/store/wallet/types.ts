/**
 * Wallet — TypeScript models mirroring the backend contract (POST
 * admin/wallets/transactions/list, POST admin/wallets/credit).
 */

export interface WalletTransactionListRequest {
  page?: number;
  limit?: number;
  userId?: string;
  email?: string;
  /** Centre-scopes the list to this facility's members. */
  facilityCode?: string;
  transactionType?: 'credit' | 'debit';
  sourceType?: string;
  startDate?: string;
  endDate?: string;
}

export interface WalletTransactionItem {
  transactionId: string;
  userId: string;
  userName: string;
  email: string;
  /** "" for a walk-in/no-subscription member (or a deleted account). */
  subscriptionCode: string;
  amount: number;
  currency: string;
  transactionType: string;
  sourceType: string;
  description: string;
  balanceAfter: number;
  status: string;
  date: string | null;
  metadata: Record<string, unknown>;
}

export interface WalletTransactionListResponse {
  transactions: WalletTransactionItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Max 100 per call — a page of members already resolved elsewhere (the Members list). */
export interface WalletBalancesRequest {
  userIds: string[];
}

export interface WalletBalanceItem {
  userId: string;
  balance: number;
  currency: string;
}

export interface WalletBalancesResponse {
  balances: WalletBalanceItem[];
}

/** Either `userId` or `email` identifies the member — `userId` wins when both are sent. */
export interface WalletCreditRequest {
  userId?: string;
  email?: string;
  amount: number;
  reason: string;
}

export interface WalletCreditResponse {
  userId: string;
  userName: string;
  email: string;
  amount: number;
  currency: string;
  balance: number;
  transactionId: string;
  walletCreated: boolean;
  notified: boolean;
}

export interface WalletInitialState {
  isLoading: boolean;
  error: string | null;
  transactions: WalletTransactionListResponse;
  isCrediting: boolean;
  creditError: string | null;
}

export const initialWalletState: WalletInitialState = {
  isLoading: false,
  error: null,
  transactions: {
    transactions: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  },
  isCrediting: false,
  creditError: null,
};
