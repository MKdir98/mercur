import type { RegistrationChannel } from "../auth/registration-channel"

export function otpSubjectKey(
  channel: RegistrationChannel,
  raw: string
): string {
  const t = raw.trim()
  if (channel === "email") {
    return t.toLowerCase()
  }
  return t.replace(/[^0-9+]/g, "")
}
