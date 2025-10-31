/**
 * SMS.ir Service for Backend
 * ارسال پیامک OTP از طریق SMS.ir
 */

interface SendOTPResponse {
  success: boolean
  messageId?: string
  error?: string
  code?: string // فقط در sandbox mode برای debug
}

interface SmsIrConfig {
  apiKey: string
  lineNumber: string
  templateId: string
  baseUrl: string
  isSandbox: boolean
}

interface SandboxMessage {
  phone: string
  code: string
  timestamp: number
  expiresAt: number
}

// ذخیره پیامک‌های sandbox برای debug
const sandboxMessages = new Map<string, SandboxMessage>()

export class SmsIrService {
  private config: SmsIrConfig

  constructor(config: SmsIrConfig) {
    this.config = config
  }

  /**
   * ارسال کد OTP به شماره تلفن
   */
  async sendOTP(phone: string, code: string): Promise<SendOTPResponse> {
    const normalizedPhone = phone.replace(/[^0-9+]/g, '')

    // اگر در حالت sandbox هستیم
    if (this.config.isSandbox) {
      return this.sendSandboxOTP(normalizedPhone, code)
    }

    try {
      // ارسال واقعی از طریق SMS.ir API
      const response = await fetch(`${this.config.baseUrl}/send/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.config.apiKey,
        },
        body: JSON.stringify({
          mobile: normalizedPhone,
          templateId: this.config.templateId,
          parameters: [
            {
              name: 'code',
              value: code,
            },
          ],
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('SMS.ir API error:', errorText)
        return {
          success: false,
          error: `خطا در ارسال پیامک: ${errorText}`,
        }
      }

      const data = await response.json()

      return {
        success: true,
        messageId: data.messageId,
      }
    } catch (error) {
      console.error('SMS send error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطا در ارسال پیامک',
      }
    }
  }

  /**
   * ارسال OTP در حالت sandbox (برای تست - بدون fetch)
   * در این حالت اصلاً به SMS.ir درخواست نمیره
   * فقط کد رو در memory ذخیره می‌کنیم و کاربر باید از API دیگه‌ای کدها رو ببینه
   */
  private async sendSandboxOTP(
    phone: string,
    code: string
  ): Promise<SendOTPResponse> {
    const timestamp = Date.now()
    const expiresAt = timestamp + 5 * 60 * 1000 // 5 دقیقه

    const message: SandboxMessage = {
      phone,
      code,
      timestamp,
      expiresAt,
    }

    // ذخیره در memory (نه database، نه external API)
    sandboxMessages.set(phone, message)

    // پاکسازی پیامک‌های قدیمی
    this.cleanupOldMessages()

    // لاگ برای debug (فقط در console backend)
    console.log('📱 [LOCAL SMS - NO FETCH] OTP Code:', {
      phone,
      code,
      expiresAt: new Date(expiresAt).toISOString(),
      note: 'کاربر باید از API /store/auth/sandbox-messages کدها رو ببینه',
    })

    return {
      success: true,
      messageId: `local_${timestamp}`,
      code: code, // برای تست، کد رو برمی‌گردونیم
    }
  }

  /**
   * پاکسازی پیامک‌های قدیمی (بیشتر از 30 دقیقه)
   */
  private cleanupOldMessages() {
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000
    for (const [phone, message] of sandboxMessages.entries()) {
      if (message.timestamp < thirtyMinutesAgo) {
        sandboxMessages.delete(phone)
      }
    }
  }

  /**
   * دریافت پیامک‌های sandbox (برای debug در admin)
   */
  static getSandboxMessages(): SandboxMessage[] {
    return Array.from(sandboxMessages.values()).sort(
      (a, b) => b.timestamp - a.timestamp
    )
  }

  /**
   * پاکسازی تمام پیامک‌های sandbox
   */
  static clearSandboxMessages(): void {
    sandboxMessages.clear()
  }
}

/**
 * تولید کد OTP 6 رقمی
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * ساخت instance از SMS service با config از environment
 */
export function createSmsService(): SmsIrService {
  const isSandbox = process.env.APP_ENV === 'local' || process.env.APP_ENV === 'demo'

  const config: SmsIrConfig = {
    // در sandbox mode این مقادیر استفاده نمیشن (چون اصلاً fetch نداریم)
    apiKey: isSandbox ? '' : (process.env.SMS_IR_API_KEY || ''),
    lineNumber: isSandbox ? '' : (process.env.SMS_IR_LINE_NUMBER || ''),
    templateId: isSandbox ? '' : (process.env.SMS_IR_TEMPLATE_ID || ''),
    baseUrl: isSandbox ? '' : 'https://api.sms.ir/v1',
    isSandbox,
  }

  return new SmsIrService(config)
}

