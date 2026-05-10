import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

const today = new Date().toISOString().slice(0, 10);

export type Task = {
    id: string;
    user_id: string;
    title: string;
    completed: boolean;
    date: string;
    created_at: string | null;
};

export function useTasks(userId: string | null) {
    const queryClient = useQueryClient();

    const tasksQuery = useQuery<Task[]>({
        queryKey: ["tasks", today, userId],
        queryFn: async () => {
            if (!userId) return [];
            const { data, error } = await supabase
                .from("tasks")
                .select("*")
                .eq("user_id", userId)
                .eq("date", today)
                .order("created_at", { ascending: true });
            if (error) throw error;
            return data ?? [];
        },
        enabled: Boolean(userId),
    });

    const addTaskMutation = useMutation<Task, Error, string>({
        mutationFn: async (title: string) => {
            const { data, error } = await supabase.from("tasks").insert([{ user_id: userId!, title, date: today }]);
            if (error) throw error;
            return data?.[0] as unknown as Task;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", today, userId] }),
    });

    const toggleTaskMutation = useMutation<Task, Error, Task>({
        mutationFn: async (task: Task) => {
            const { data, error } = await supabase
                .from("tasks")
                .update({ completed: !task.completed })
                .eq("id", task.id);
            if (error) throw error;
            return data?.[0] as unknown as Task;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", today, userId] }),
    });

    const deleteTaskMutation = useMutation<string, Error, string>({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("tasks").delete().eq("id", id);
            if (error) throw error;
            return id;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", today, userId] }),
    });

    const tasks = tasksQuery.data ?? [];
    const completedCount = tasks.filter((task) => task.completed).length;
    const maxReached = tasks.length >= 7;

    return {
        tasks,
        isLoading: tasksQuery.isLoading,
        isError: tasksQuery.isError,
        addTask: async (title: string) => {
            await addTaskMutation.mutateAsync(title);
        },
        toggleTask: async (task: Task) => {
            await toggleTaskMutation.mutateAsync(task);
        },
        deleteTask: async (id: string) => {
            await deleteTaskMutation.mutateAsync(id);
        },
        completedCount,
        totalCount: tasks.length,
        maxReached,
    };
}
