export type RegistrationChannel = "phone" | "email"

export function getRegistrationChannel(): RegistrationChannel {
  const v = (process.env.AUTH_REGISTRATION_CHANNEL || "phone").toLowerCase()
  return v === "email" ? "email" : "phone"
}
