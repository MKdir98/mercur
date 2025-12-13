import { MedusaService } from '@medusajs/framework/utils'
import { Wallet } from './models/wallet'
import { WalletTransaction, WalletTransactionType, WalletTransactionStatus } from './models/wallet-transaction'
import { WithdrawRequest, WithdrawRequestStatus } from './models/withdraw-request'

class WalletModuleService extends MedusaService({
  Wallet,
  WalletTransaction,
  WithdrawRequest,
}) {
  async createWalletForCustomer(customerId: string, currency: string = 'IRR') {
    const existing = await this.listWallets({ customer_id: customerId })
    
    if (existing.length > 0) {
      return existing[0]
    }

    return await this.createWallets({
      customer_id: customerId,
      balance: 0,
      blocked_balance: 0,
      currency,
    })
  }

  async getWalletByCustomerId(customerId: string) {
    const wallets = await this.listWallets({ customer_id: customerId })
    return wallets.length > 0 ? wallets[0] : null
  }

  async getAvailableBalance(walletId: string): Promise<number> {
    const wallet = await this.retrieveWallet(walletId)
    return Number(wallet.balance) - Number(wallet.blocked_balance)
  }

  async deposit(walletId: string, amount: number, referenceId?: string, metadata?: any) {
    const wallet = await this.retrieveWallet(walletId)
    const newBalance = Number(wallet.balance) + amount

    await this.updateWallets({
      id: walletId,
      balance: newBalance,
    })

    await this.createWalletTransactions({
      wallet_id: walletId,
      type: WalletTransactionType.DEPOSIT,
      amount,
      status: WalletTransactionStatus.COMPLETED,
      reference_id: referenceId,
      metadata,
    })

    return await this.retrieveWallet(walletId)
  }

  async blockAmount(walletId: string, amount: number, referenceId: string) {
    const wallet = await this.retrieveWallet(walletId)
    const availableBalance = Number(wallet.balance) - Number(wallet.blocked_balance)

    if (availableBalance < amount) {
      throw new Error('Insufficient available balance')
    }

    const newBlockedBalance = Number(wallet.blocked_balance) + amount

    await this.updateWallets({
      id: walletId,
      blocked_balance: newBlockedBalance,
    })

    await this.createWalletTransactions({
      wallet_id: walletId,
      type: WalletTransactionType.BLOCK,
      amount,
      status: WalletTransactionStatus.COMPLETED,
      reference_id: referenceId,
    })

    return await this.retrieveWallet(walletId)
  }

  async unblockAmount(walletId: string, amount: number, referenceId: string) {
    const wallet = await this.retrieveWallet(walletId)
    const newBlockedBalance = Math.max(0, Number(wallet.blocked_balance) - amount)

    await this.updateWallets({
      id: walletId,
      blocked_balance: newBlockedBalance,
    })

    await this.createWalletTransactions({
      wallet_id: walletId,
      type: WalletTransactionType.UNBLOCK,
      amount,
      status: WalletTransactionStatus.COMPLETED,
      reference_id: referenceId,
    })

    return await this.retrieveWallet(walletId)
  }

  async debitBlockedAmount(walletId: string, amount: number, referenceId: string) {
    const wallet = await this.retrieveWallet(walletId)

    if (Number(wallet.blocked_balance) < amount) {
      throw new Error('Insufficient blocked balance')
    }

    const newBalance = Number(wallet.balance) - amount
    const newBlockedBalance = Number(wallet.blocked_balance) - amount

    await this.updateWallets({
      id: walletId,
      balance: newBalance,
      blocked_balance: newBlockedBalance,
    })

    await this.createWalletTransactions({
      wallet_id: walletId,
      type: WalletTransactionType.DEBIT,
      amount,
      status: WalletTransactionStatus.COMPLETED,
      reference_id: referenceId,
    })

    return await this.retrieveWallet(walletId)
  }

  async requestWithdraw(walletId: string, customerId: string, amount: number, shebaNumber: string) {
    const wallet = await this.retrieveWallet(walletId)
    const availableBalance = Number(wallet.balance) - Number(wallet.blocked_balance)

    if (availableBalance < amount) {
      throw new Error('Insufficient available balance for withdrawal')
    }

    await this.blockAmount(walletId, amount, `withdraw_request_${Date.now()}`)

    return await this.createWithdrawRequests({
      wallet_id: walletId,
      customer_id: customerId,
      amount,
      sheba_number: shebaNumber,
      status: WithdrawRequestStatus.PENDING,
    })
  }

  async approveWithdraw(requestId: string, adminId: string) {
    const request = await this.retrieveWithdrawRequest(requestId)

    if (request.status !== WithdrawRequestStatus.PENDING) {
      throw new Error('Withdraw request is not in pending status')
    }

    const wallet = await this.retrieveWallet(request.wallet_id)
    const newBalance = Number(wallet.balance) - Number(request.amount)
    const newBlockedBalance = Number(wallet.blocked_balance) - Number(request.amount)

    await this.updateWallets({
      id: request.wallet_id,
      balance: newBalance,
      blocked_balance: newBlockedBalance,
    })

    await this.createWalletTransactions({
      wallet_id: request.wallet_id,
      type: WalletTransactionType.WITHDRAW,
      amount: Number(request.amount),
      status: WalletTransactionStatus.COMPLETED,
      reference_id: requestId,
    })

    await this.updateWithdrawRequests({
      id: requestId,
      status: WithdrawRequestStatus.APPROVED,
      admin_id: adminId,
      processed_at: new Date(),
    })

    return await this.retrieveWithdrawRequest(requestId)
  }

  async rejectWithdraw(requestId: string, adminId: string, reason: string) {
    const request = await this.retrieveWithdrawRequest(requestId)

    if (request.status !== WithdrawRequestStatus.PENDING) {
      throw new Error('Withdraw request is not in pending status')
    }

    await this.unblockAmount(request.wallet_id, Number(request.amount), requestId)

    await this.updateWithdrawRequests({
      id: requestId,
      status: WithdrawRequestStatus.REJECTED,
      rejection_reason: reason,
      admin_id: adminId,
      processed_at: new Date(),
    })

    return await this.retrieveWithdrawRequest(requestId)
  }
}

export default WalletModuleService

