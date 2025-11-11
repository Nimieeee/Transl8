'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { Voice, VoiceClone } from '@/types/api';

export function useVoices(language?: string) {
  const { data: voices, isLoading } = useQuery<Voice[]>({
    queryKey: ['voices', language],
    queryFn: async () => {
      const params = language ? `?language=${language}` : '';
      const response = await apiClient.get<{ voices: Voice[] }>(`/voices${params}`);
      return response.data.voices;
    },
  });

  return {
    voices: voices || [],
    isLoading,
  };
}

export function useVoiceClones() {
  const queryClient = useQueryClient();

  const { data: clones, isLoading } = useQuery<VoiceClone[]>({
    queryKey: ['voice-clones'],
    queryFn: async () => {
      const response = await apiClient.get<{ clones: VoiceClone[] }>('/voices/clones');
      return response.data.clones;
    },
  });

  const createCloneMutation = useMutation({
    mutationFn: async (data: { name: string; audioFile: File; language: string }) => {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('audio', data.audioFile);
      formData.append('language', data.language);

      const response = await apiClient.post<{ clone: VoiceClone }>('/voices/clone', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.clone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-clones'] });
    },
  });

  const deleteCloneMutation = useMutation({
    mutationFn: async (cloneId: string) => {
      await apiClient.delete(`/voices/clones/${cloneId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-clones'] });
    },
  });

  return {
    clones: clones || [],
    isLoading,
    createClone: createCloneMutation.mutate,
    deleteClone: deleteCloneMutation.mutate,
    isCreating: createCloneMutation.isPending,
    createError: createCloneMutation.error,
  };
}
