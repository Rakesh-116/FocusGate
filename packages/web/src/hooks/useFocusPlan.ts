import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getLocalDateKey } from '../lib/date'
import { buildScenarioNarrative, buildScenarioPrompt, clampIntensity, computeDailyScore, computeFutureOutcome, type FutureOutcome } from '../lib/focus'

export type UserGoal = {
  id: string
  user_id: string
  title: string
  description: string | null
  target_role: string | null
  target_company: string | null
  intensity: number
  is_active: boolean
}

type TaskRow = {
  id: string
  title: string
  completed: boolean
  completed_at: string | null
}

type DailyCommitRow = {
  id: string
  user_id: string
  goal_id: string | null
  task_id: string | null
  title: string
  notes: string | null
  date: string
  sort_order: number | null
  completed_at: string | null
}

export type DailyCommit = DailyCommitRow & {
  task: TaskRow | null
  completed: boolean
}

export type FutureGeneration = {
  id: string
  user_id: string
  goal_id: string | null
  daily_log_id: string | null
  date: string
  scenario_type: 'hell' | 'heaven'
  status: 'draft' | 'ready' | 'failed'
  score: number
  streak_days: number
  intensity: number
  prompt: string | null
  narrative: string
  image_url: string | null
  video_url: string | null
}

type DailyLog = {
  id: string
  user_id: string
  goal_id: string | null
  date: string
  committed_count: number
  completed_count: number
  score: number
  outcome: FutureOutcome
  notes: string | null
}

type FocusPlanData = {
  goal: UserGoal | null
  commits: DailyCommit[]
  dailyLog: DailyLog | null
  futures: FutureGeneration[]
}

function getDefaultGoalTitle(goal: UserGoal | null) {
  return goal?.title || goal?.target_role || 'your future self'
}

export function useFocusPlan(userId: string | null, streakDays: number) {
  const queryClient = useQueryClient()
  const today = getLocalDateKey()

  const focusPlanQuery = useQuery<FocusPlanData>({
    queryKey: ['focus-plan', userId, today],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) {
        return { goal: null, commits: [], dailyLog: null, futures: [] }
      }

      const goalPromise = supabase
        .from('user_goals')
        .select('id,user_id,title,description,target_role,target_company,intensity,is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      const commitsPromise = supabase
        .from('daily_commits')
        .select('id,user_id,goal_id,task_id,title,notes,date,sort_order,completed_at,task:tasks(id,title,completed,completed_at)')
        .eq('user_id', userId)
        .eq('date', today)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      const logPromise = supabase
        .from('daily_logs')
        .select('id,user_id,goal_id,date,committed_count,completed_count,score,outcome,notes')
        .eq('user_id', userId)
        .eq('date', today)
        .limit(1)
        .maybeSingle()

      const futuresPromise = supabase
        .from('future_generations')
        .select('id,user_id,goal_id,daily_log_id,date,scenario_type,status,score,streak_days,intensity,prompt,narrative,image_url,video_url')
        .eq('user_id', userId)
        .eq('date', today)
        .order('scenario_type', { ascending: true })

      const [goalResult, commitsResult, logResult, futuresResult] = await Promise.all([
        goalPromise,
        commitsPromise,
        logPromise,
        futuresPromise,
      ])

      if (goalResult.error) throw goalResult.error
      if (commitsResult.error) throw commitsResult.error
      if (logResult.error) throw logResult.error
      if (futuresResult.error) throw futuresResult.error

      const commits = (commitsResult.data ?? []).map((commit) => {
        const task = Array.isArray(commit.task) ? commit.task[0] : commit.task
        return {
          ...commit,
          task: task ?? null,
          completed: Boolean(task?.completed ?? commit.completed_at),
        }
      }) as DailyCommit[]

      return {
        goal: goalResult.data as UserGoal | null,
        commits,
        dailyLog: (logResult.data ?? null) as DailyLog | null,
        futures: (futuresResult.data ?? []) as FutureGeneration[],
      }
    },
  })

  const goalMutation = useMutation({
    mutationFn: async (payload: { title: string; description: string; targetRole: string; targetCompany: string; intensity: number }) => {
      if (!userId) throw new Error('Missing user.')

      const nextGoal = {
        user_id: userId,
        title: payload.title.trim(),
        description: payload.description.trim() || null,
        target_role: payload.targetRole.trim() || null,
        target_company: payload.targetCompany.trim() || null,
        intensity: clampIntensity(payload.intensity),
        is_active: true,
      }

      const existingGoal = focusPlanQuery.data?.goal
      if (existingGoal?.id) {
        const result = await supabase
          .from('user_goals')
          .update({
            ...nextGoal,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingGoal.id)
          .select('id')
          .single()
        if (result.error) throw result.error
        return result.data
      }

      const result = await supabase.from('user_goals').insert(nextGoal).select('id').single()
      if (result.error) throw result.error
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-plan', userId, today] })
    },
  })

  const addCommitmentMutation = useMutation({
    mutationFn: async (payload: { title: string; notes?: string }) => {
      if (!userId) throw new Error('Missing user.')
      const title = payload.title.trim()
      if (!title) throw new Error('Commitment title is required.')

      const existingCommits = focusPlanQuery.data?.commits ?? []
      const sortOrder = existingCommits.length
      const goalId = focusPlanQuery.data?.goal?.id ?? null
      const taskInsert = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          title,
          date: today,
          sort_order: sortOrder,
          metadata: { source: 'daily_commit' },
        })
        .select('id')
        .single()
      if (taskInsert.error) throw taskInsert.error

      const commitInsert = await supabase
        .from('daily_commits')
        .insert({
          user_id: userId,
          goal_id: goalId,
          task_id: taskInsert.data.id,
          title,
          notes: payload.notes?.trim() || null,
          date: today,
          sort_order: sortOrder,
        })
        .select('id')
        .single()
      if (commitInsert.error) throw commitInsert.error
      return commitInsert.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-plan', userId, today] })
      queryClient.invalidateQueries({ queryKey: ['tasks', today, userId] })
    },
  })

  const toggleCommitmentMutation = useMutation({
    mutationFn: async (commit: DailyCommit) => {
      if (!commit.task_id) {
        throw new Error('This commitment is missing a linked task.')
      }

      const nextCompleted = !commit.completed
      const timestamp = nextCompleted ? new Date().toISOString() : null

      const taskResult = await supabase
        .from('tasks')
        .update({
          completed: nextCompleted,
          completed_at: timestamp,
          updated_at: new Date().toISOString(),
        })
        .eq('id', commit.task_id)
        .select('id')
        .single()
      if (taskResult.error) throw taskResult.error

      const commitResult = await supabase
        .from('daily_commits')
        .update({
          completed_at: timestamp,
          updated_at: new Date().toISOString(),
        })
        .eq('id', commit.id)
        .select('id')
        .single()
      if (commitResult.error) throw commitResult.error
      return commitResult.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-plan', userId, today] })
      queryClient.invalidateQueries({ queryKey: ['tasks', today, userId] })
    },
  })

  const removeCommitmentMutation = useMutation({
    mutationFn: async (commit: DailyCommit) => {
      const deleteCommitResult = await supabase.from('daily_commits').delete().eq('id', commit.id)
      if (deleteCommitResult.error) throw deleteCommitResult.error

      if (commit.task_id) {
        const deleteTaskResult = await supabase.from('tasks').delete().eq('id', commit.task_id)
        if (deleteTaskResult.error) throw deleteTaskResult.error
      }
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-plan', userId, today] })
      queryClient.invalidateQueries({ queryKey: ['tasks', today, userId] })
    },
  })

  const generateFutureMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Missing user.')

      const commits = focusPlanQuery.data?.commits ?? []
      const goal = focusPlanQuery.data?.goal
      const committedCount = commits.length
      const completedCount = commits.filter((commit) => commit.completed).length
      const score = computeDailyScore(committedCount, completedCount)
      const outcome = computeFutureOutcome(score)

      const logResult = await supabase
        .from('daily_logs')
        .upsert(
          {
            user_id: userId,
            goal_id: goal?.id ?? null,
            date: today,
            committed_count: committedCount,
            completed_count: completedCount,
            score,
            outcome,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,date' },
        )
        .select('id,user_id,goal_id,date,committed_count,completed_count,score,outcome,notes')
        .single()
      if (logResult.error) throw logResult.error

      const goalSnapshot = {
        title: goal?.title ?? null,
        description: goal?.description ?? null,
        target_role: goal?.target_role ?? null,
        target_company: goal?.target_company ?? null,
        intensity: goal?.intensity ?? 3,
      }

      const rows = [
        {
          user_id: userId,
          goal_id: goal?.id ?? null,
          daily_log_id: logResult.data.id,
          date: today,
          scenario_type: 'hell' as const,
          status: 'ready' as const,
          score,
          streak_days: streakDays,
          intensity: clampIntensity(goal?.intensity),
          prompt: buildScenarioPrompt('hell', goalSnapshot, score, streakDays),
          narrative: buildScenarioNarrative('hell', goalSnapshot, score, streakDays, completedCount, committedCount),
          updated_at: new Date().toISOString(),
        },
        {
          user_id: userId,
          goal_id: goal?.id ?? null,
          daily_log_id: logResult.data.id,
          date: today,
          scenario_type: 'heaven' as const,
          status: 'ready' as const,
          score,
          streak_days: streakDays,
          intensity: clampIntensity(goal?.intensity),
          prompt: buildScenarioPrompt('heaven', goalSnapshot, score, streakDays),
          narrative: buildScenarioNarrative('heaven', goalSnapshot, score, streakDays, completedCount, committedCount),
          updated_at: new Date().toISOString(),
        },
      ]

      const deleteResult = await supabase.from('future_generations').delete().eq('user_id', userId).eq('date', today)
      if (deleteResult.error) throw deleteResult.error

      const insertResult = await supabase
        .from('future_generations')
        .insert(rows)
        .select('id,user_id,goal_id,daily_log_id,date,scenario_type,status,score,streak_days,intensity,prompt,narrative,image_url,video_url')
      if (insertResult.error) throw insertResult.error

      return {
        dailyLog: logResult.data as DailyLog,
        futures: (insertResult.data ?? []) as FutureGeneration[],
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-plan', userId, today] })
    },
  })

  const goal = focusPlanQuery.data?.goal ?? null
  const commits = focusPlanQuery.data?.commits ?? []
  const futures = focusPlanQuery.data?.futures ?? []
  const dailyLog = focusPlanQuery.data?.dailyLog ?? null
  const committedCount = commits.length
  const completedCount = commits.filter((commit) => commit.completed).length
  const score = computeDailyScore(committedCount, completedCount)
  const outcome = computeFutureOutcome(score)
  const featuredFuture =
    futures.find((item) => item.scenario_type === (score >= 70 ? 'heaven' : 'hell')) ??
    futures.find((item) => item.scenario_type === 'heaven') ??
    futures[0] ??
    null

  return {
    goal,
    commits,
    futures,
    dailyLog,
    score,
    outcome,
    committedCount,
    completedCount,
    featuredFuture,
    goalLabel: getDefaultGoalTitle(goal),
    isLoading: focusPlanQuery.isLoading,
    isSavingGoal: goalMutation.isPending,
    isGeneratingFuture: generateFutureMutation.isPending,
    saveGoal: async (payload: { title: string; description: string; targetRole: string; targetCompany: string; intensity: number }) => {
      await goalMutation.mutateAsync(payload)
    },
    addCommitment: async (title: string, notes?: string) => {
      await addCommitmentMutation.mutateAsync({ title, notes })
    },
    toggleCommitment: async (commit: DailyCommit) => {
      await toggleCommitmentMutation.mutateAsync(commit)
    },
    removeCommitment: async (commit: DailyCommit) => {
      await removeCommitmentMutation.mutateAsync(commit)
    },
    generateFuture: async () => {
      await generateFutureMutation.mutateAsync()
    },
  }
}
