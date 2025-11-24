'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Film, Trash2, MoreVertical } from 'lucide-react';

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
      {/* Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border-color)_1px,transparent_1px),linear-gradient(to_bottom,var(--border-color)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30" />
      
      {/* Header */}
      <div className="relative z-10 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-white">
                STUDIO
              </h1>
              <p className="text-[var(--text-muted)] mt-1 font-mono text-sm">
                {projects.length} {projects.length === 1 ? 'project' : 'projects'}
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="group relative px-6 py-3 bg-gradient-to-r from-[#ff3366] to-[#ff4477] rounded-xl font-bold text-white overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,51,102,0.5)]"
            >
              <span className="relative z-10 flex items-center gap-2">
                <span className="text-2xl">+</span>
                New Project
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {projects.length === 0 ? (
          <div className={`text-center py-24 ${mounted ? 'animate-fade-in opacity-0' : 'opacity-0'}`}>
            <div className="inline-flex p-6 bg-gradient-to-br from-[#ff3366]/20 to-[#ff3366]/5 rounded-3xl mb-6">
              <Film className="w-16 h-16 text-[#ff3366]" strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-bold text-[#a0a0b8] mb-2">No projects yet</h3>
            <p className="text-[#6b6b7f] mb-8">Create your first dubbing project to get started</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-8 py-4 bg-gradient-to-r from-[#ff3366] to-[#ff4477] rounded-xl font-bold text-white hover:scale-105 transition-transform duration-300"
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, i) => (
              <div
                key={project.id}
                className={`group relative p-6 bg-[#13131a] border border-[#2a2a38] rounded-2xl hover:border-[#ff3366] transition-all duration-300 hover:transform hover:-translate-y-2 ${mounted ? 'animate-slide-up opacity-0' : 'opacity-0'}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {/* Status indicator */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <div className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border bg-gradient-to-r ${getStatusColor(project.status)}`}>
                    {project.status}
                  </div>
                  <button
                    onClick={(e) => handleDeleteClick(e, project.id)}
                    disabled={deletingId === project.id}
                    className="p-2 bg-[#1a1a24] border border-[#2a2a38] rounded-lg hover:border-red-500/50 hover:bg-red-500/10 transition-colors group/delete"
                    title="Delete project"
                  >
                    {deletingId === project.id ? (
                      <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-[#6b6b7f] group-hover/delete:text-red-400 transition-colors" />
                    )}
                  </button>
                </div>

                {/* Content - clickable */}
                <div 
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="cursor-pointer mt-8"
                >
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#ff3366] transition-colors">
                    {project.name}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-[#6b6b7f] font-mono text-sm mb-4">
                    <span className="px-2 py-1 bg-[#1a1a24] rounded border border-[#2a2a38]">
                      {project.source_language.toUpperCase()}
                    </span>
                    <span className="text-[#ff3366]">→</span>
                    <span className="px-2 py-1 bg-[#1a1a24] rounded border border-[#2a2a38]">
                      {project.target_language.toUpperCase()}
                    </span>
                  </div>

                  <div className="text-xs text-[#6b6b7f] font-mono">
                    {new Date(project.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>

                {/* Hover effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#ff3366]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-[#13131a] border border-[#2a2a38] rounded-3xl max-w-md w-full p-8 animate-slide-up">
            <h2 className="text-3xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#ff3366] to-[#00d9ff]">
              New Project
            </h2>
            <form onSubmit={createProject} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-[#a0a0b8] mb-2 font-mono">
                  PROJECT NAME
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1a1a24] border border-[#2a2a38] rounded-xl text-white focus:border-[#ff3366] focus:outline-none transition-colors"
                  placeholder="My Awesome Video"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[#a0a0b8] mb-2 font-mono">
                    FROM
                  </label>
                  <select
                    value={sourceLanguage}
                    onChange={(e) => setSourceLanguage(e.target.value)}
                    className="w-full px-4 py-3 bg-[#1a1a24] border border-[#2a2a38] rounded-xl text-white focus:border-[#ff3366] focus:outline-none transition-colors"
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
                  <label className="block text-sm font-bold text-[#a0a0b8] mb-2 font-mono">
                    TO
                  </label>
                  <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="w-full px-4 py-3 bg-[#1a1a24] border border-[#2a2a38] rounded-xl text-white focus:border-[#ff3366] focus:outline-none transition-colors"
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
                  className="flex-1 py-3 bg-[#1a1a24] border border-[#2a2a38] rounded-xl font-bold text-[#a0a0b8] hover:border-[#6b6b7f] transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => {
              if (deletingId === null) {
                setShowDeleteConfirm(false);
                setProjectToDelete(null);
              }
            }}
          />
          <div className="relative bg-[#13131a] border border-red-500/30 rounded-3xl max-w-md w-full p-8 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/30">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h2 className="text-2xl font-black text-white">
                Delete Project?
              </h2>
            </div>
            <p className="text-[#a0a0b8] mb-6">
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
