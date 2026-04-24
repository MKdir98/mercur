import { Resend } from "resend"
import nodemailer from "nodemailer"

export interface SendOtpEmailResult {
  success: boolean
  error?: string
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmailAddress(value: string): boolean {
  return emailRegex.test(value.trim())
}

export async function sendOtpEmail(
  to: string,
  code: string
): Promise<SendOtpEmailResult> {
  const recipient = to.trim()
  if (!isValidEmailAddress(recipient)) {
    return { success: false, error: "فرمت ایمیل صحیح نیست" }
  }

  if (process.env.OTP_EMAIL_DEBUG === "true") {
    console.info(`[OTP_EMAIL_DEBUG] to=${recipient} code=${code}`)
    return { success: true }
  }

  const from =
    process.env.OTP_EMAIL_FROM ||
    process.env.EMAIL_FROM ||
    ""

  if (!from) {
    return {
      success: false,
      error: "تنظیمات ایمیل ناقص است (OTP_EMAIL_FROM)",
    }
  }

  const subject =
    process.env.OTP_EMAIL_SUBJECT || "کد تأیید شما"

  const html =
    process.env.OTP_EMAIL_HTML_TEMPLATE?.replace(/\{\{code\}\}/g, code) ||
    `<p>کد تأیید شما: <strong>${code}</strong></p><p>این کد تا چند دقیقه معتبر است.</p>`

  const provider = (
    process.env.OTP_EMAIL_PROVIDER || "resend"
  ).toLowerCase()

  if (provider === "smtp") {
    const host = process.env.SMTP_HOST
    const port = Number(process.env.SMTP_PORT || "587")
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS
    const secure =
      process.env.SMTP_SECURE === "true" || String(port) === "465"

    if (!host || !user || !pass) {
      return {
        success: false,
        error: "تنظیمات SMTP ناقص است (SMTP_HOST, SMTP_USER, SMTP_PASSWORD)",
      }
    }

    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      })

      await transporter.sendMail({
        from,
        to: recipient,
        subject,
        html,
      })

      return { success: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "خطا در ارسال ایمیل"
      return { success: false, error: msg }
    }
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return {
      success: false,
      error: "RESEND_API_KEY تنظیم نشده است",
    }
  }

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from,
      to: [recipient],
      subject,
      html,
    })

    if (error) {
      return {
        success: false,
        error: error.message || "خطا در ارسال ایمیل",
      }
    }

    return { success: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطا در ارسال ایمیل"
    return { success: false, error: msg }
  }
}
