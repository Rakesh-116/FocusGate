export type FutureOutcome = 'hell' | 'heaven' | 'neutral'
export type FutureScenarioType = 'hell' | 'heaven'

export type GoalSnapshot = {
  title: string | null
  description?: string | null
  target_role?: string | null
  target_company?: string | null
  intensity?: number | null
}

export function clampIntensity(intensity: number | null | undefined) {
  return Math.max(1, Math.min(5, Number(intensity ?? 3) || 3))
}

export function computeDailyScore(committedCount: number, completedCount: number) {
  if (committedCount <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((completedCount / committedCount) * 100)))
}

export function computeFutureOutcome(score: number): FutureOutcome {
  if (score >= 80) return 'heaven'
  if (score <= 45) return 'hell'
  return 'neutral'
}

export function buildScenarioNarrative(
  scenarioType: FutureScenarioType,
  goal: GoalSnapshot,
  score: number,
  streakDays: number,
  completedCount: number,
  committedCount: number,
) {
  const goalLabel = goal.title || goal.target_role || 'the version of you that you keep talking about'
  const roleLabel = goal.target_role || 'your target role'
  const companyLabel = goal.target_company || 'the kind of company you respect'

  if (scenarioType === 'heaven') {
    return `You kept ${completedCount} of ${committedCount} promises today and landed a ${score}/100 day. If this rhythm compounds, six months from now you look calmer, sharper, and closer to ${goalLabel}. Your ${streakDays}-day streak feels real, your interview stories are stronger, and getting into ${companyLabel} for ${roleLabel} stops feeling hypothetical.`
  }

  return `You only kept ${completedCount} of ${committedCount} promises today and ended on a ${score}/100 day. If this pattern compounds, six months from now ${goalLabel} stays a fantasy instead of a plan. The weak ${streakDays}-day streak shows up as stress, lower confidence, and the feeling of watching people move toward ${companyLabel} while you keep restarting.`
}

export function buildScenarioPrompt(
  scenarioType: FutureScenarioType,
  goal: GoalSnapshot,
  score: number,
  streakDays: number,
) {
  const intensity = clampIntensity(goal.intensity)
  const title = goal.title || goal.target_role || 'career breakthrough'
  const role = goal.target_role || 'software engineer'
  const company = goal.target_company || 'a strong product company'
  const mood =
    scenarioType === 'heaven'
      ? 'realistic, hopeful, disciplined, grounded, cinematic, not fantasy'
      : `realistic, cautionary, emotionally intense level ${intensity}, believable, not horror fantasy`

  return `Future self simulation for ${title}. Scenario: ${scenarioType}. Current score: ${score}/100. Current streak: ${streakDays} days. Visualize the user six months from now as a ${role} candidate aiming for ${company}. Mood: ${mood}.`
}
