'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { 
  Upload, 
  Film, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Download, 
  ArrowLeft,
  Play,
  Languages,
  Clock
} from 'lucide-react';
import MobileNav from '@/components/MobileNav';

interface Project {
  id: string;
  name: string;
  status: string;
  source_language: string;
  target_language: string;
  video_url?: string;
  output_video_url?: string;
  created_at: string;
}

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadProject();
    const interval = setInterval(loadProject, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const loadProject = async () => {
    try {
      const { data } = await apiClient.get(`/projects/${params.id}`);
      setProject(data);
    } catch (error) {
      console.error('Failed to load project', error);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await apiClient.post(`/projects/${params.id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log('Upload response:', response.data);
      setFile(null);
      loadProject();
    } catch (error) {
      console.error('Upload failed', error);
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = () => {
    switch (project?.status) {
      case 'COMPLETED': return <CheckCircle2 className="w-6 h-6 text-green-400" />;
      case 'PROCESSING': return <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />;
      case 'FAILED': return <XCircle className="w-6 h-6 text-red-400" />;
      default: return <Film className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (project?.status) {
      case 'COMPLETED': return 'from-green-500/20 to-green-600/20 border-green-500/50 text-green-400';
      case 'PROCESSING': return 'from-blue-500/20 to-blue-600/20 border-blue-500/50 text-blue-400';
      case 'FAILED': return 'from-red-500/20 to-red-600/20 border-red-500/50 text-red-400';
      default: return 'from-gray-500/20 to-gray-600/20 border-gray-500/50 text-gray-400';
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#ff3366] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Mobile Navigation */}
      <MobileNav />
      
      {/* Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#2a2a38_1px,transparent_1px),linear-gradient(to_bottom,#2a2a38_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30" />
      
      {/* Header */}
      <div className="relative z-10 border-b border-[#2a2a38] bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-[#6b6b7f] hover:text-[#ff3366] transition-colors mb-3 sm:mb-4 group min-h-[44px]"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-mono text-xs sm:text-sm">Back to Studio</span>
          </button>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white mb-2 break-words">
                {project.name}
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-2 text-[#6b6b7f] font-mono flex-wrap">
                  <Languages className="w-4 h-4 flex-shrink-0" />
                  <span className="px-2 py-1 bg-[#1a1a24] rounded border border-[#2a2a38] text-xs">
                    {project.source_language.toUpperCase()}
                  </span>
                  <span className="text-[#ff3366]">→</span>
                  <span className="px-2 py-1 bg-[#1a1a24] rounded border border-[#2a2a38] text-xs">
                    {project.target_language.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[#6b6b7f] font-mono">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs">{new Date(project.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-mono font-semibold border bg-gradient-to-r ${getStatusColor()} flex items-center gap-2 self-start whitespace-nowrap`}>
              {getStatusIcon()}
              <span className="hidden xs:inline">{project.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Upload Section */}
          <div className={`bg-[#13131a] border border-[#2a2a38] rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 ${mounted ? 'animate-slide-up opacity-0' : 'opacity-0'}`}>
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-[#ff3366]/20 to-[#ff3366]/5 rounded-xl border border-[#ff3366]/30 flex-shrink-0">
                <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-[#ff3366]" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-white truncate">Upload Video</h2>
                <p className="text-xs sm:text-sm text-[#6b6b7f] font-mono truncate">MP4, MOV, AVI • Max 500MB</p>
              </div>
            </div>

            {!project.video_url ? (
              <div className="space-y-3 sm:space-y-4">
                <label className="block">
                  <div className="border-2 border-dashed border-[#2a2a38] rounded-xl p-6 sm:p-8 text-center hover:border-[#ff3366] transition-colors cursor-pointer group active:scale-95">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <Film className="w-10 h-10 sm:w-12 sm:h-12 text-[#6b6b7f] mx-auto mb-2 sm:mb-3 group-hover:text-[#ff3366] transition-colors" />
                    <p className="text-sm sm:text-base text-[#a0a0b8] font-semibold mb-1 break-words px-2">
                      {file ? file.name : 'Click to select video'}
                    </p>
                    <p className="text-xs sm:text-sm text-[#6b6b7f] font-mono">
                      {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'or drag and drop'}
                    </p>
                  </div>
                </label>

                <button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="w-full py-3 sm:py-4 bg-gradient-to-r from-[#ff3366] to-[#ff4477] rounded-xl font-bold text-base sm:text-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-transform duration-300 flex items-center justify-center gap-2 min-h-[52px]"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Start Dubbing
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-[#1a1a24] border border-[#2a2a38] rounded-xl">
                  <div className="flex items-center gap-3">
                    <Play className="w-5 h-5 text-[#00d9ff]" />
                    <div className="flex-1">
                      <p className="text-white font-semibold">Video uploaded</p>
                      <p className="text-sm text-[#6b6b7f] font-mono">Processing started automatically</p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Status Section */}
          <div className={`bg-[#13131a] border border-[#2a2a38] rounded-2xl p-8 ${mounted ? 'animate-slide-up opacity-0 delay-100' : 'opacity-0'}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-[#00d9ff]/20 to-[#00d9ff]/5 rounded-xl border border-[#00d9ff]/30">
                <Film className="w-6 h-6 text-[#00d9ff]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Processing Status</h2>
                <p className="text-sm text-[#6b6b7f] font-mono">Real-time pipeline updates</p>
              </div>
            </div>

            {project.status === 'PROCESSING' && (
              <div className="space-y-4">
                <div className="p-4 bg-[#1a1a24] border border-[#2a2a38] rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                    <span className="text-white font-semibold">Dubbing in progress...</span>
                  </div>
                  <div className="space-y-2 text-sm text-[#6b6b7f] font-mono">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      Speech-to-text extraction
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                      AI translation
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                      Voice synthesis
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                      Video muxing
                    </div>
                  </div>
                </div>
              </div>
            )}

            {project.status === 'COMPLETED' && project.output_video_url && (
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="text-white font-semibold">Dubbing complete!</span>
                  </div>
                  <p className="text-sm text-[#6b6b7f] font-mono mb-4">
                    Your dubbed video is ready to download
                  </p>
                  <a
                    href={project.output_video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl font-bold text-white hover:scale-105 transition-transform duration-300"
                  >
                    <Download className="w-5 h-5" />
                    Download Result
                  </a>
                </div>
              </div>
            )}

            {project.status === 'FAILED' && (
              <div className="p-4 bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-white font-semibold">Processing failed</p>
                    <p className="text-sm text-[#6b6b7f] font-mono">Please try uploading again</p>
                  </div>
                </div>
              </div>
            )}

            {project.status === 'DRAFT' && (
              <div className="p-4 bg-[#1a1a24] border border-[#2a2a38] rounded-xl text-center">
                <Film className="w-12 h-12 text-[#6b6b7f] mx-auto mb-3" />
                <p className="text-[#a0a0b8] font-semibold mb-1">Ready to start</p>
                <p className="text-sm text-[#6b6b7f] font-mono">Upload a video to begin dubbing</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
