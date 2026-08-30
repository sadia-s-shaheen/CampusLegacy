// lib/transactivity.ts

export type CollaborationProfile = {
  user_id: string
  projects_analyzed: number
  messages_analyzed: number

  transactivity_score: number
  reasoning_score: number
  questioning_score: number
  knowledge_sharing_score: number
  initiative_score: number

  follow_through_score: number
  participation_balance_score: number

  updated_at?: string
}

export type TransactivityBreakdown = {
  transactivity: number
  reasoning: number
  questioning: number
  knowledge_sharing: number
  initiative: number
}

/**
 * Clamp a score to [0, 1].
 */
export function clampScore(value: unknown): number {
  const numberValue =
    typeof value === "number"
      ? value
      : Number(value)

  if (!Number.isFinite(numberValue)) {
    return 0
  }

  return Math.max(
    0,
    Math.min(1, numberValue)
  )
}

/**
 * Convert a 0-1 score to 0-100.
 */
export function toPercentage(
  value: number
): number {
  return Math.round(
    clampScore(value) * 100
  )
}

/**
 * Weighted collaboration score.
 *
 * Transactivity receives the largest weight because
 * it represents actual building-on-peer-reasoning.
 */
export function calculateCollaborationScore(
  profile: CollaborationProfile
): number {
  const score =
    profile.transactivity_score * 0.35 +
    profile.reasoning_score * 0.20 +
    profile.questioning_score * 0.10 +
    profile.knowledge_sharing_score * 0.15 +
    profile.initiative_score * 0.10 +
    profile.follow_through_score * 0.05 +
    profile.participation_balance_score * 0.05

  return clampScore(score)
}

/**
 * Human readable interpretation.
 */
export function getCollaborationLevel(
  score: number
): {
  label: string
  description: string
} {
  const percentage = toPercentage(score)

  if (percentage >= 85) {
    return {
      label: "Highly Collaborative",
      description:
        "Actively builds on teammates' reasoning and contributes consistently.",
    }
  }

  if (percentage >= 70) {
    return {
      label: "Strong Collaborator",
      description:
        "Frequently contributes useful ideas and builds on team discussion.",
    }
  }

  if (percentage >= 50) {
    return {
      label: "Developing",
      description:
        "Participates regularly but has room to deepen collaborative exchanges.",
    }
  }

  if (percentage >= 30) {
    return {
      label: "Low Collaboration",
      description:
        "Contributions are present but often remain parallel rather than interactive.",
    }
  }

  return {
    label: "Minimal Collaboration",
    description:
      "Very little evidence of building on or responding to teammates' reasoning.",
  }
}

/**
 * Calculate a confidence value based on
 * number of analyzed messages.
 *
 * This prevents a single message from being
 * treated as a strong behavioral signal.
 */
export function calculateConfidence(
  messagesAnalyzed: number
): number {
  const n = Math.max(
    0,
    messagesAnalyzed
  )

  // Reaches ~95% confidence around 60 messages.
  return 1 - Math.exp(-n / 20)
}