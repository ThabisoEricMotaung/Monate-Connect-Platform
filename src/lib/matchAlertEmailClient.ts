import type { MatchAlertEmailResult, MatchAlertInput } from "./matchAlerts"

export async function sendMatchAlertEmails(
  inputs: MatchAlertInput[],
): Promise<MatchAlertEmailResult> {
  const response = await fetch("/api/match-alerts/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ alerts: inputs }),
  })

  const payload = (await response.json().catch(() => null)) as
    | (MatchAlertEmailResult & { error?: string })
    | null

  if (!response.ok) {
    throw new Error(payload?.error || "Failed to send match alert emails.")
  }

  if (!payload) {
    throw new Error("Match alert email response was empty.")
  }

  return payload
}
