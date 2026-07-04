/**
 * SMS.ir Service for Backend
 * ارسال پیامک OTP از طریق SMS.ir
 */
import { randomInt } from "crypto"

import { logExternalServiceCall } from '@mercurjs/framework'

interface SendOTPResponse {
  success: boolean
  messageId?: string
  error?: string
  code?: string // فقط در sandbox mode برای debug
}

interface SendSmsResponse {
  success: boolean
  messageId?: string
  error?: string
}

interface SmsIrConfig {
  apiKey: string
  lineNumber: string
  templateId: string
  baseUrl: string
  isSandbox: boolean
  logFn?: (entry: {
    action: string
    endpoint: string
    status: 'success' | 'error'
    request_data?: Record<string, unknown>
    response_data?: Record<string, unknown>
    duration_ms: number
    error_message?: string
  }) => void
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
    const endpoint = `${this.config.baseUrl}/send/verify`

    // اگر در حالت sandbox هستیم
    if (this.config.isSandbox) {
      return this.sendSandboxOTP(normalizedPhone, code)
    }

    const start = Date.now()
    const requestData = { mobile: normalizedPhone, templateId: this.config.templateId }

    try {
      // ارسال واقعی از طریق SMS.ir API
      const response = await fetch(endpoint, {
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
        this.config.logFn?.({
          action: 'sendOTP',
          endpoint,
          status: 'error',
          request_data: requestData,
          duration_ms: Date.now() - start,
          error_message: errorText,
        })
        return {
          success: false,
          error: `خطا در ارسال پیامک: ${errorText}`,
        }
      }

      const data = await response.json()

      this.config.logFn?.({
        action: 'sendOTP',
        endpoint,
        status: 'success',
        request_data: requestData,
        response_data: data,
        duration_ms: Date.now() - start,
      })

      return {
        success: true,
        messageId: data.messageId,
      }
    } catch (error) {
      console.error('SMS send error:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'خطا در ارسال پیامک'
      this.config.logFn?.({
        action: 'sendOTP',
        endpoint,
        status: 'error',
        request_data: requestData,
        duration_ms: Date.now() - start,
        error_message: errorMessage,
      })
      return {
        success: false,
        error: errorMessage,
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
   * ارسال پیامک با قالب دلخواه (برای اطلاع‌رسانی سفارش و ارسال)
   */
  async sendTemplate(
    phone: string,
    templateId: string,
    params: Record<string, string>
  ): Promise<SendSmsResponse> {
    const normalizedPhone = phone.replace(/[^0-9+]/g, '')
    const endpoint = `${this.config.baseUrl}/send/verify`
    const requestData = { mobile: normalizedPhone, templateId, params }

    if (this.config.isSandbox) {
      console.log('📱 [LOCAL SMS - NO FETCH] Template SMS:', {
        phone: normalizedPhone,
        templateId,
        params,
      })
      // Sandbox never hits SMS.ir — logged as 'error' so it's easy to spot
      // in service_log why a real SMS never actually went out.
      this.config.logFn?.({
        action: 'sendTemplate',
        endpoint,
        status: 'error',
        request_data: requestData,
        duration_ms: 0,
        error_message: 'sandbox mode — SMS not actually sent',
      })
      return { success: true, messageId: `local_${Date.now()}` }
    }

    const start = Date.now()

    try {
      const parameters = Object.entries(params).map(([name, value]) => ({
        name,
        value,
      }))

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.config.apiKey,
        },
        body: JSON.stringify({
          mobile: normalizedPhone,
          templateId: parseInt(templateId, 10),
          parameters,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('SMS.ir API error:', errorText)
        this.config.logFn?.({
          action: 'sendTemplate',
          endpoint,
          status: 'error',
          request_data: requestData,
          duration_ms: Date.now() - start,
          error_message: errorText,
        })
        return { success: false, error: `خطا در ارسال پیامک: ${errorText}` }
      }

      const data = await response.json()
      this.config.logFn?.({
        action: 'sendTemplate',
        endpoint,
        status: 'success',
        request_data: requestData,
        response_data: data,
        duration_ms: Date.now() - start,
      })
      return { success: true, messageId: data.messageId }
    } catch (error) {
      console.error('SMS send error:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'خطا در ارسال پیامک'
      this.config.logFn?.({
        action: 'sendTemplate',
        endpoint,
        status: 'error',
        request_data: requestData,
        duration_ms: Date.now() - start,
        error_message: errorMessage,
      })
      return {
        success: false,
        error: errorMessage,
      }
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
  return randomInt(100000, 1000000).toString()
}

/**
 * ساخت instance از SMS service با config از environment
 *
 * `container` is optional so existing call sites keep working without changes,
 * but pass it whenever available — it wires sends up to service_log (table +
 * Kibana) via logExternalServiceCall so failed/sandboxed sends are visible.
 */
export function createSmsService(container?: any): SmsIrService {
  // هر محیطی غیر از production در حالت sandbox است (فقط لاگ، بدون ارسال واقعی)
  const isSandbox = (process.env.APP_ENV || 'production') !== 'production'

  const config: SmsIrConfig = {
    // در sandbox mode این مقادیر استفاده نمیشن (چون اصلاً fetch نداریم)
    apiKey: isSandbox ? '' : (process.env.SMS_IR_API_KEY || ''),
    lineNumber: isSandbox ? '' : (process.env.SMS_IR_LINE_NUMBER || ''),
    templateId: isSandbox ? '' : (process.env.SMS_IR_TEMPLATE_ID || ''),
    baseUrl: isSandbox ? '' : 'https://api.sms.ir/v1',
    isSandbox,
    logFn: container
      ? (entry) =>
          logExternalServiceCall(container, {
            service_name: 'sms.ir',
            ...entry,
          })
      : undefined,
  }

  return new SmsIrService(config)
}

