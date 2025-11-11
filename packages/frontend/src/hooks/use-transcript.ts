'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { Transcript } from '@/types/api';

export function useTranscript(projectId: string) {
  const queryClient = useQueryClient();

  const { data: transcript, isLoading } = useQuery<Transcript>({
    queryKey: ['projects', projectId, 'transcript'],
    queryFn: async () => {
      const response = await apiClient.get<{ transcript: Transcript }>(
        `/projects/${projectId}/transcript`
      );
      return response.data.transcript;
    },
    enabled: !!projectId,
  });

  const updateTranscriptMutation = useMutation({
    mutationFn: async (data: { segments: Transcript['segments'] }) => {
      const response = await apiClient.put<{ transcript: Transcript }>(
        `/projects/${projectId}/transcript`,
        data
      );
      return response.data.transcript;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'transcript'] });
    },
  });

  const approveTranscriptMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/projects/${projectId}/approve-stage`, {
        stage: 'stt',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'status'] });
    },
  });

  return {
    transcript,
    isLoading,
    updateTranscript: updateTranscriptMutation.mutate,
    approveTranscript: approveTranscriptMutation.mutate,
    isUpdating: updateTranscriptMutation.isPending,
    isApproving: approveTranscriptMutation.isPending,
  };
}
