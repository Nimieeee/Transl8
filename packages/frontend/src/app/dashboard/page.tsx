'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Film, Trash2, MoreVertical } from 'lucide-react';
import MobileNav from '@/components/MobileNav';

interface Project {
  id: string;
  name: string;
  status: string;
  source_language: string;
  target_language: string;
  created_at: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [mounted, setMounted] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const { data } = await apiClient.get('/projects');
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects', error);
    }
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/projects', { name, sourceLanguage, targetLanguage });
      setShowModal(false);
      setName('');
      loadProjects();
    } catch (error) {
      console.error('Failed to create project', error);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setProjectToDelete(projectId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    
    setDeletingId(projectToDelete);
    try {
      await apiClient.delete(`/projects/${projectToDelete}`);
      setShowDeleteConfirm(false);
      setProjectToDelete(null);
      loadProjects();
    } catch (error) {
      console.error('Failed to delete project', error);
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'from-green-500/20 to-green-600/20 border-green-500/50 text-green-400';
      case 'PROCESSING': return 'from-blue-500/20 to-blue-600/20 border-blue-500/50 text-blue-400';
      case 'FAILED': return 'from-red-500/20 to-red-600/20 border-red-500/50 text-red-400';
      default: return 'from-gray-500/20 to-gray-600/20 border-gray-500/50 text-gray-400';
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Mobile Navigation */}
      <MobileNav onCreateProject={() => setShowModal(true)} />
      
      {/* Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border-color)_1px,transparent_1px),linear-gradient(to_bottom,var(--border-color)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30" />
      
      {/* Header */}
      <div className="relative z-10 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex justify-between items-center gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white truncate">
                STUDIO
              </h1>
              <p className="text-[var(--text-muted)] mt-1 font-mono text-xs sm:text-sm">
                {projects.length} {projects.length === 1 ? 'project' : 'projects'}
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="group relative px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#ff3366] to-[#ff4477] rounded-xl font-bold text-sm sm:text-base text-white overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,51,102,0.5)] whitespace-nowrap"
            >
              <span className="relative z-10 flex items-center gap-1 sm:gap-2">
                <span className="text-xl sm:text-2xl">+</span>
                <span className="hidden xs:inline">New Project</span>
                <span className="xs:hidden">New</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {projects.length === 0 ? (
          <div className={`text-center py-16 sm:py-24 px-4 ${mounted ? 'animate-fade-in opacity-0' : 'opacity-0'}`}>
            <div className="inline-flex p-5 sm:p-6 bg-gradient-to-br from-[#ff3366]/20 to-[#ff3366]/5 rounded-3xl mb-4 sm:mb-6">
              <Film className="w-12 h-12 sm:w-16 sm:h-16 text-[#ff3366]" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-[#a0a0b8] mb-2">No projects yet</h3>
            <p className="text-sm sm:text-base text-[#6b6b7f] mb-6 sm:mb-8">Create your first dubbing project to get started</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-[#ff3366] to-[#ff4477] rounded-xl font-bold text-sm sm:text-base text-white hover:scale-105 transition-transform duration-300"
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {projects.map((project, i) => (
              <div
                key={project.id}
                className={`group relative p-4 sm:p-6 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl hover:border-[var(--accent-primary)] transition-all duration-300 hover:transform hover:-translate-y-2 shadow-lg ${mounted ? 'animate-slide-up opacity-0' : 'opacity-0'}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {/* Status indicator */}
                <div className="absolute top-3 sm:top-4 right-3 sm:right-4 flex items-center gap-1 sm:gap-2">
                  <div className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-mono font-semibold border bg-gradient-to-r ${getStatusColor(project.status)}`}>
                    {project.status}
                  </div>
                  <button
                    onClick={(e) => handleDeleteClick(e, project.id)}
                    disabled={deletingId === project.id}
                    className="p-1.5 sm:p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg hover:border-red-500/50 hover:bg-red-500/10 transition-colors group/delete"
                    title="Delete project"
                  >
                    {deletingId === project.id ? (
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--text-muted)] group-hover/delete:text-red-400 transition-colors" />
                    )}
                  </button>
                </div>

                {/* Content - clickable */}
                <div 
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="cursor-pointer mt-6 sm:mt-8"
                >
                  <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] mb-2 sm:mb-3 group-hover:text-[var(--accent-primary)] transition-colors line-clamp-2">
                    {project.name}
                  </h3>
                  
                  <div className="flex items-center gap-1.5 sm:gap-2 text-[var(--text-muted)] font-mono text-xs sm:text-sm mb-3 sm:mb-4">
                    <span className="px-2 py-1 bg-[var(--bg-tertiary)] rounded border border-[var(--border-color)]">
                      {project.source_language.toUpperCase()}
                    </span>
                    <span className="text-[var(--accent-primary)]">→</span>
                    <span className="px-2 py-1 bg-[var(--bg-tertiary)] rounded border border-[var(--border-color)]">
                      {project.target_language.toUpperCase()}
                    </span>
                  </div>

                  <div className="text-xs text-[var(--text-muted)] font-mono">
                    {new Date(project.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>

                {/* Hover effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-[var(--bg-secondary)] border-t sm:border border-[var(--border-color)] rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md p-6 sm:p-8 animate-slide-up shadow-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl sm:text-3xl font-black mb-4 sm:mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]">
              New Project
            </h2>
            <form onSubmit={createProject} className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2 font-mono">
                  PROJECT NAME
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none transition-colors"
                  placeholder="My Awesome Video"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2 font-mono">
                    FROM
                  </label>
                  <select
                    value={sourceLanguage}
                    onChange={(e) => setSourceLanguage(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none transition-colors"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="zh">Chinese</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2 font-mono">
                    TO
                  </label>
                  <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none transition-colors"
                  >
                    <option value="es">Spanish</option>
                    <option value="en">English</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="zh">Chinese</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-[#ff3366] to-[#ff4477] rounded-xl font-bold text-white hover:scale-105 transition-transform duration-300"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl font-bold text-[var(--text-secondary)] hover:border-[var(--text-muted)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => {
              if (deletingId === null) {
                setShowDeleteConfirm(false);
                setProjectToDelete(null);
              }
            }}
          />
          <div className="relative bg-[var(--bg-secondary)] border-t sm:border border-red-500/30 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md p-6 sm:p-8 animate-slide-up shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/30">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-2xl font-black text-[var(--text-primary)]">
                Delete Project?
              </h2>
            </div>
            <p className="text-[var(--text-secondary)] mb-6">
              This action cannot be undone. All project data, including uploaded videos and processing results, will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  confirmDelete();
                }}
                disabled={deletingId !== null}
                className="flex-1 py-3 bg-gradient-to-r from-red-500 to-red-600 rounded-xl font-bold text-white hover:scale-105 transition-transform duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deletingId ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    Delete
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (deletingId === null) {
                    setShowDeleteConfirm(false);
                    setProjectToDelete(null);
                  }
                }}
                disabled={deletingId !== null}
                className="flex-1 py-3 bg-[#1a1a24] border border-[#2a2a38] rounded-xl font-bold text-[#a0a0b8] hover:border-[#6b6b7f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
