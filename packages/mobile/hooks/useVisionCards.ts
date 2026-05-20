import * as FileSystem from 'expo-file-system'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { decode } from 'base64-arraybuffer'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export type VisionCardItem = {
  id: string
  image_url: string
  caption: string | null
  sort_order: number | null
}

export function useVisionCards() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const visionCardsQuery = useQuery<VisionCardItem[]>({
    queryKey: ['vision-cards', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return []
      const result = await supabase
        .from('vision_cards')
        .select('id,image_url,caption,sort_order')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true })

      if (result.error) throw result.error
      return result.data ?? []
    },
  })

  const addCardMutation = useMutation({
    mutationFn: async ({ imageUri, caption }: { imageUri: string; caption: string }) => {
      if (!user?.id) throw new Error('Missing user session')
      const path = `${user.id}/${crypto.randomUUID()}.jpg`
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64' as any,
      })

      const uploadResult = await supabase.storage
        .from('vision-cards')
        .upload(path, decode(base64), { contentType: 'image/jpeg', upsert: false })

      if (uploadResult.error) throw uploadResult.error

      const publicUrlResult = supabase.storage.from('vision-cards').getPublicUrl(path)
      const imageUrl = publicUrlResult.data.publicUrl

      const visionCardsTable = supabase.from('vision_cards') as any
      const result = await visionCardsTable
        .insert([
          {
            user_id: user.id,
            image_url: imageUrl,
            caption: caption || null,
            sort_order: (visionCardsQuery.data?.length ?? 0) + 1,
          },
        ])
        .select('id,image_url,caption,sort_order')
        .single()

      if (result.error) throw result.error
      return result.data as VisionCardItem
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vision-cards', user?.id] })
    },
  })

  const deleteCardMutation = useMutation({
    mutationFn: async ({ id, imageUrl }: { id: string; imageUrl: string }) => {
      const pathMarker = '/storage/v1/object/public/vision-cards/'
      const markerIndex = imageUrl.indexOf(pathMarker)
      const storagePath = markerIndex >= 0 ? imageUrl.slice(markerIndex + pathMarker.length) : null

      if (storagePath) {
        await supabase.storage.from('vision-cards').remove([storagePath])
      }

      const result = await supabase.from('vision_cards').delete().eq('id', id)
      if (result.error) throw result.error
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vision-cards', user?.id] })
    },
  })

  return {
    visionCards: visionCardsQuery.data ?? [],
    isLoading: visionCardsQuery.isLoading,
    isError: visionCardsQuery.isError,
    error: visionCardsQuery.error,
    addCard: addCardMutation.mutateAsync,
    deleteCard: deleteCardMutation.mutateAsync,
    isSaving: addCardMutation.isPending || deleteCardMutation.isPending,
  }
}
