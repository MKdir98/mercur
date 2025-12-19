export interface Wallet {
  id: string
  customer_id: string
  balance: number
  blocked_balance: number
  currency: string
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export enum WalletTransactionType {
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  BLOCK = 'block',
  UNBLOCK = 'unblock',
  DEBIT = 'debit',
  CREDIT = 'credit',
}

export enum WalletTransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface WalletTransaction {
  id: string
  wallet_id: string
  type: WalletTransactionType
  amount: number
  status: WalletTransactionStatus
  reference_id: string | null
  description: string | null
  metadata: Record<string, any> | null
  created_at: Date
  updated_at: Date
}

export enum WithdrawRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
}

export interface WithdrawRequest {
  id: string
  wallet_id: string
  customer_id: string
  amount: number
  sheba_number: string
  status: WithdrawRequestStatus
  rejection_reason: string | null
  admin_id: string | null
  processed_at: Date | null
  created_at: Date
  updated_at: Date
}






