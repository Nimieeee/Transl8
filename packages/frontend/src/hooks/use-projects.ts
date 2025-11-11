'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { Project, ProjectStatus } from '@/types/api';

export function useProjects() {
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await apiClient.get<{ projects: Project[] }>('/projects');
      return response.data.projects;
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: { name: string; sourceLanguage: string; targetLanguage: string }) => {
      const response = await apiClient.post<{ project: Project }>('/projects', data);
      return response.data.project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      await apiClient.delete(`/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  return {
    projects: projects || [],
    isLoading,
    createProject: createProjectMutation.mutate,
    deleteProject: deleteProjectMutation.mutate,
    isCreating: createProjectMutation.isPending,
    isDeleting: deleteProjectMutation.isPending,
    createError: createProjectMutation.error,
  };
}

export function useProject(projectId: string) {
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ['projects', projectId],
    queryFn: async () => {
      const response = await apiClient.get<{ project: Project }>(`/projects/${projectId}`);
      return response.data.project;
    },
    enabled: !!projectId,
  });

  const { data: status } = useQuery<ProjectStatus>({
    queryKey: ['projects', projectId, 'status'],
    queryFn: async () => {
      const response = await apiClient.get<ProjectStatus>(`/projects/${projectId}/status`);
      return response.data;
    },
    enabled: !!projectId,
    refetchInterval: (query) => {
      // Poll every 2 seconds if processing
      const data = query.state.data;
      if (data?.project.status === 'processing') {
        return 2000;
      }
      return false;
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (data: Partial<Project>) => {
      const response = await apiClient.put<{ project: Project }>(`/projects/${projectId}`, data);
      return response.data.project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  return {
    project,
    status,
    isLoading,
    updateProject: updateProjectMutation.mutate,
    isUpdating: updateProjectMutation.isPending,
  };
}
