export enum ZarinpalTransactionStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface ZarinpalTransaction {
  id: string
  wallet_transaction_id: string | null
  authority: string
  ref_id: string | null
  amount: number
  status: ZarinpalTransactionStatus
  callback_url: string
  description: string | null
  metadata: Record<string, any> | null
  verified_at: Date | null
  created_at: Date
  updated_at: Date
}






