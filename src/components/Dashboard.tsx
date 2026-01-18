'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  FolderOpen,
  History,
  Star,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Edit,
  ExternalLink,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  X,
  FolderPlus,
  Globe,
  StickyNote,
  ChevronRight,
} from 'lucide-react';
import {
  Project,
  StoredAnalysis,
  StorageStats,
  getAllProjects,
  getAllAnalyses,
  getStorageStats,
  createProject,
  updateProject,
  deleteProject,
  toggleProjectFavorite,
  deleteAnalysis,
  saveAnalysis,
  PROJECT_COLORS,
} from '@/lib/storage/projectStorage';
import { AnalysisResult } from '@/types';

interface DashboardProps {
  onSelectUrl: (url: string) => void;
  onClose: () => void;
  currentAnalysis?: AnalysisResult | null;
}

type Tab = 'overview' | 'projects' | 'history';

export function Dashboard({ onSelectUrl, onClose, currentAnalysis }: DashboardProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [projects, setProjects] = useState<Project[]>([]);
  const [analyses, setAnalyses] = useState<StoredAnalysis[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showAssignToProject, setShowAssignToProject] = useState(false);

  const isLoggedIn = !!session?.user;

  useEffect(() => {
    loadData();
  }, [isLoggedIn]);

  async function loadData() {
    setLoading(true);
    try {
      if (isLoggedIn) {
        // Für eingeloggte User: Daten aus Datenbank laden
        const [projectsRes, analysesRes, statsRes] = await Promise.all([
          fetch('/api/projects').then(r => r.ok ? r.json() : { projects: [] }),
          fetch('/api/analyses').then(r => r.ok ? r.json() : { analyses: [] }),
          fetch('/api/dashboard/stats').then(r => r.ok ? r.json() : null),
        ]);

        setProjects(projectsRes.projects || []);
        setAnalyses(analysesRes.analyses || []);
        setStats(statsRes || null);
      } else {
        // Für nicht eingeloggte User: Daten aus IndexedDB laden
        const [projectsData, analysesData, statsData] = await Promise.all([
          getAllProjects(),
          getAllAnalyses(),
          getStorageStats(),
        ]);
        setProjects(projectsData);
        setAnalyses(analysesData);
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (confirm('Projekt und alle zugehörigen Analysen wirklich löschen?')) {
      if (isLoggedIn) {
        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          alert('Fehler beim Löschen des Projekts');
          return;
        }
      } else {
        await deleteProject(projectId);
      }
      await loadData();
    }
  };

  const handleToggleFavorite = async (projectId: string) => {
    if (isLoggedIn) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...project, isFavorite: !project.isFavorite }),
        });
        if (!response.ok) {
          alert('Fehler beim Aktualisieren des Projekts');
          return;
        }
      }
    } else {
      await toggleProjectFavorite(projectId);
    }
    await loadData();
  };

  const handleDeleteAnalysis = async (analysisId: string) => {
    if (confirm('Analyse wirklich löschen?')) {
      if (isLoggedIn) {
        const response = await fetch(`/api/analyses/${analysisId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          alert('Fehler beim Löschen der Analyse');
          return;
        }
      } else {
        await deleteAnalysis(analysisId);
      }
      await loadData();
    }
  };

  const handleSaveCurrentAnalysis = async (projectId?: string) => {
    if (currentAnalysis) {
      if (isLoggedIn) {
        const response = await fetch('/api/analyses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: currentAnalysis.url,
            result: currentAnalysis,
            projectId,
          }),
        });
        if (!response.ok) {
          alert('Fehler beim Speichern der Analyse');
          return;
        }
      } else {
        await saveAnalysis(currentAnalysis, projectId);
      }
      await loadData();
      setShowAssignToProject(false);
    }
  };

  const filteredAnalyses = analyses.filter(a =>
    a.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const favoriteProjects = projects.filter(p => p.isFavorite);
  const recentAnalyses = analyses.slice(0, 5);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-700 bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
            <h2 className="text-lg sm:text-xl font-bold text-slate-200">Dashboard</h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {currentAnalysis && (
              <button
                onClick={() => setShowAssignToProject(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Analyse speichern</span>
                <span className="sm:hidden">Speichern</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 bg-slate-800/30 overflow-x-auto shrink-0">
          <TabButton
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            icon={<BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            label="Übersicht"
          />
          <TabButton
            active={activeTab === 'projects'}
            onClick={() => setActiveTab('projects')}
            icon={<FolderOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            label={`Projekte (${projects.length})`}
          />
          <TabButton
            active={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
            icon={<History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            label={`Historie (${analyses.length})`}
          />
        </div>

        {/* Search Bar */}
        {(activeTab === 'projects' || activeTab === 'history') && (
          <div className="px-3 sm:px-6 py-2 sm:py-3 border-b border-slate-800 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-3 sm:p-6 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-4 sm:space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                    <StatCard
                      label="Analysen"
                      value={stats?.totalAnalyses || 0}
                      icon={<History className="w-5 h-5" />}
                      color="indigo"
                    />
                    <StatCard
                      label="URLs"
                      value={stats?.totalUrls || 0}
                      icon={<Globe className="w-5 h-5" />}
                      color="cyan"
                    />
                    <StatCard
                      label="Projekte"
                      value={stats?.totalProjects || 0}
                      icon={<FolderOpen className="w-5 h-5" />}
                      color="purple"
                    />
                    <StatCard
                      label="Ø Score"
                      value={stats?.avgScore || 0}
                      icon={<BarChart3 className="w-5 h-5" />}
                      color={stats?.avgScore && stats.avgScore >= 70 ? 'green' : stats?.avgScore && stats.avgScore >= 50 ? 'yellow' : 'red'}
                      suffix="%"
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Favorite Projects */}
                    <div className="bg-slate-800/50 rounded-lg sm:rounded-xl border border-slate-700 p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-slate-200 flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-400" />
                          Favoriten
                        </h3>
                        <button
                          onClick={() => setActiveTab('projects')}
                          className="text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          Alle anzeigen
                        </button>
                      </div>
                      {favoriteProjects.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-4">
                          Keine Favoriten vorhanden
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {favoriteProjects.slice(0, 4).map((project) => (
                            <ProjectCard
                              key={project.id}
                              project={project}
                              compact
                              onSelect={() => {
                                if (project.urls[0]) {
                                  onSelectUrl(project.urls[0]);
                                  onClose();
                                }
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recent Analyses */}
                    <div className="bg-slate-800/50 rounded-lg sm:rounded-xl border border-slate-700 p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-slate-200 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          Letzte Analysen
                        </h3>
                        <button
                          onClick={() => setActiveTab('history')}
                          className="text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          Alle anzeigen
                        </button>
                      </div>
                      {recentAnalyses.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-4">
                          Keine Analysen vorhanden
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {recentAnalyses.map((analysis) => (
                            <AnalysisCard
                              key={analysis.id}
                              analysis={analysis}
                              compact
                              onSelect={() => {
                                onSelectUrl(analysis.url);
                                onClose();
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top Issues */}
                  {stats?.topIssues && stats.topIssues.length > 0 && (
                    <div className="bg-slate-800/50 rounded-lg sm:rounded-xl border border-slate-700 p-3 sm:p-4">
                      <h3 className="font-medium text-slate-200 flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                        Häufigste Probleme
                      </h3>
                      <div className="space-y-2">
                        {stats.topIssues.map((issue, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-slate-700/30 rounded-lg"
                          >
                            <span className="text-sm text-slate-300">{issue.issue}</span>
                            <span className="text-xs text-slate-500 bg-slate-600 px-2 py-0.5 rounded">
                              {issue.count}x
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Projects Tab */}
              {activeTab === 'projects' && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowCreateProject(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
                    >
                      <FolderPlus className="w-4 h-4" />
                      Neues Projekt
                    </button>
                  </div>

                  {filteredProjects.length === 0 ? (
                    <div className="text-center py-8 sm:py-12">
                      <FolderOpen className="w-10 h-10 sm:w-12 sm:h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm sm:text-base">Keine Projekte gefunden</p>
                      <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Erstelle ein Projekt, um deine Analysen zu organisieren.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {filteredProjects.map((project) => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          onSelect={() => {
                            if (project.urls[0]) {
                              onSelectUrl(project.urls[0]);
                              onClose();
                            }
                          }}
                          onEdit={() => setEditingProject(project)}
                          onDelete={() => handleDeleteProject(project.id)}
                          onToggleFavorite={() => handleToggleFavorite(project.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <div className="space-y-3">
                  {filteredAnalyses.length === 0 ? (
                    <div className="text-center py-12">
                      <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">Keine Analysen gefunden</p>
                    </div>
                  ) : (
                    filteredAnalyses.map((analysis) => (
                      <AnalysisCard
                        key={analysis.id}
                        analysis={analysis}
                        onSelect={() => {
                          onSelectUrl(analysis.url);
                          onClose();
                        }}
                        onDelete={() => handleDeleteAnalysis(analysis.id)}
                      />
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Create/Edit Project Modal */}
        {(showCreateProject || editingProject) && (
          <ProjectModal
            project={editingProject}
            onClose={() => {
              setShowCreateProject(false);
              setEditingProject(null);
            }}
            onSave={async (projectData) => {
              if (isLoggedIn) {
                if (editingProject) {
                  const response = await fetch(`/api/projects/${editingProject.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...editingProject, ...projectData }),
                  });
                  if (!response.ok) {
                    const error = await response.json();
                    if (error.upgradeRequired) {
                      alert(error.message || 'Projekt-Limit erreicht. Upgrade auf Pro für mehr Projekte.');
                    } else {
                      alert('Fehler beim Aktualisieren des Projekts');
                    }
                    return;
                  }
                } else {
                  const response = await fetch('/api/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(projectData),
                  });
                  if (!response.ok) {
                    const error = await response.json();
                    if (error.upgradeRequired) {
                      alert(error.message || 'Projekt-Limit erreicht. Upgrade auf Pro für mehr Projekte.');
                    } else {
                      alert('Fehler beim Erstellen des Projekts');
                    }
                    return;
                  }
                }
              } else {
                if (editingProject) {
                  await updateProject({ ...editingProject, ...projectData });
                } else {
                  await createProject(projectData);
                }
              }
              await loadData();
              setShowCreateProject(false);
              setEditingProject(null);
            }}
          />
        )}

        {/* Assign to Project Modal */}
        {showAssignToProject && currentAnalysis && (
          <AssignToProjectModal
            projects={projects}
            onClose={() => setShowAssignToProject(false)}
            onSave={(projectId) => handleSaveCurrentAnalysis(projectId)}
            onCreateNew={() => {
              setShowAssignToProject(false);
              setShowCreateProject(true);
            }}
          />
        )}
      </div>
    </div>
  );
}

// Helper Components
function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
        active
          ? 'text-indigo-400 border-indigo-400'
          : 'text-slate-400 border-transparent hover:text-slate-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  suffix = '',
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  suffix?: string;
}) {
  const colorClasses: Record<string, string> = {
    indigo: 'bg-indigo-500/10 text-indigo-400',
    cyan: 'bg-cyan-500/10 text-cyan-400',
    purple: 'bg-purple-500/10 text-purple-400',
    green: 'bg-green-500/10 text-green-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
    red: 'bg-red-500/10 text-red-400',
  };

  return (
    <div className="bg-slate-800/50 rounded-lg sm:rounded-xl border border-slate-700 p-3 sm:p-4">
      <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
        <div className={`p-1.5 sm:p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        <span className="text-xs sm:text-sm text-slate-400">{label}</span>
      </div>
      <p className="text-xl sm:text-2xl font-bold text-slate-200">
        {value}{suffix}
      </p>
    </div>
  );
}

function ProjectCard({
  project,
  compact = false,
  onSelect,
  onEdit,
  onDelete,
  onToggleFavorite,
}: {
  project: Project;
  compact?: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleFavorite?: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  if (compact) {
    return (
      <button
        onClick={onSelect}
        className="w-full flex items-center gap-3 p-2 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-colors text-left"
      >
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: project.color }}
        />
        <span className="text-sm text-slate-200 truncate flex-1">{project.name}</span>
        {project.avgScore !== undefined && (
          <span className={`text-xs font-medium ${
            project.avgScore >= 70 ? 'text-green-400' :
            project.avgScore >= 50 ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {project.avgScore}%
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-slate-500" />
      </button>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <h4 className="font-medium text-slate-200">{project.name}</h4>
          {project.isFavorite && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-slate-400 hover:text-slate-200"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 bg-slate-700 rounded-lg border border-slate-600 shadow-xl z-20 py-1 min-w-[140px]">
                <button
                  onClick={() => { onToggleFavorite?.(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-600"
                >
                  <Star className="w-4 h-4" />
                  {project.isFavorite ? 'Entfernen' : 'Favorit'}
                </button>
                <button
                  onClick={() => { onEdit?.(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-600"
                >
                  <Edit className="w-4 h-4" />
                  Bearbeiten
                </button>
                <button
                  onClick={() => { onDelete?.(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-600"
                >
                  <Trash2 className="w-4 h-4" />
                  Löschen
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {project.description && (
        <p className="text-sm text-slate-400 mb-3 line-clamp-2">{project.description}</p>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{project.urls.length} URL(s)</span>
        {project.avgScore !== undefined && (
          <span className={`font-medium ${
            project.avgScore >= 70 ? 'text-green-400' :
            project.avgScore >= 50 ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            Ø {project.avgScore}%
          </span>
        )}
      </div>

      <button
        onClick={onSelect}
        className="w-full mt-3 py-2 text-sm text-indigo-400 hover:text-indigo-300 border border-slate-700 hover:border-slate-600 rounded-lg transition-colors"
      >
        Analyse starten
      </button>
    </div>
  );
}

function AnalysisCard({
  analysis,
  compact = false,
  onSelect,
  onDelete,
}: {
  analysis: StoredAnalysis;
  compact?: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  if (compact) {
    return (
      <button
        onClick={onSelect}
        className="w-full flex items-center gap-3 p-2 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-colors text-left"
      >
        <span className={`text-sm font-medium ${
          analysis.result.score >= 70 ? 'text-green-400' :
          analysis.result.score >= 50 ? 'text-yellow-400' :
          'text-red-400'
        }`}>
          {analysis.result.score}
        </span>
        <span className="text-sm text-slate-200 truncate flex-1">
          {analysis.url.replace(/https?:\/\//, '')}
        </span>
        <span className="text-xs text-slate-500">
          {new Date(analysis.createdAt).toLocaleDateString('de-DE')}
        </span>
      </button>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            analysis.result.score >= 70 ? 'bg-green-500/10' :
            analysis.result.score >= 50 ? 'bg-yellow-500/10' :
            'bg-red-500/10'
          }`}>
            <span className={`text-lg font-bold ${
              analysis.result.score >= 70 ? 'text-green-400' :
              analysis.result.score >= 50 ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {analysis.result.score}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">
              {analysis.url.replace(/https?:\/\//, '')}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {new Date(analysis.createdAt).toLocaleString('de-DE')}
            </p>
            {analysis.notes && (
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <StickyNote className="w-3 h-3" />
                {analysis.notes}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-3">
          <button
            onClick={onSelect}
            className="p-2 text-slate-400 hover:text-indigo-400 transition-colors"
            title="Analyse erneut durchführen"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <a
            href={analysis.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
            title="Website öffnen"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 text-slate-400 hover:text-red-400 transition-colors"
              title="Löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-700">
        <div className="flex items-center gap-1 text-xs">
          {analysis.result.cookieBanner.detected ? (
            <CheckCircle2 className="w-3 h-3 text-green-400" />
          ) : (
            <AlertTriangle className="w-3 h-3 text-yellow-400" />
          )}
          <span className="text-slate-400">Banner</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          {analysis.result.googleConsentMode.version === 'v2' ? (
            <CheckCircle2 className="w-3 h-3 text-green-400" />
          ) : analysis.result.googleConsentMode.detected ? (
            <AlertTriangle className="w-3 h-3 text-yellow-400" />
          ) : (
            <AlertTriangle className="w-3 h-3 text-red-400" />
          )}
          <span className="text-slate-400">Consent Mode</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-slate-400">{analysis.result.cookies.length} Cookies</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className={`${
            analysis.result.issues.filter(i => i.severity === 'error').length > 0
              ? 'text-red-400'
              : 'text-slate-400'
          }`}>
            {analysis.result.issues.filter(i => i.severity === 'error').length} Fehler
          </span>
        </div>
      </div>
    </div>
  );
}

// Project Modal
function ProjectModal({
  project,
  onClose,
  onSave,
}: {
  project: Project | null;
  onClose: () => void;
  onSave: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
}) {
  const [name, setName] = useState(project?.name || '');
  const [description, setDescription] = useState(project?.description || '');
  const [color, setColor] = useState(project?.color || PROJECT_COLORS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      urls: project?.urls || [],
      isFavorite: project?.isFavorite || false,
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-60" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-800 rounded-xl border border-slate-700 shadow-2xl z-60">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h3 className="font-medium text-slate-200">
            {project ? 'Projekt bearbeiten' : 'Neues Projekt'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Kunde XYZ"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Beschreibung</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optionale Beschreibung..."
              rows={2}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Farbe</label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
            >
              Speichern
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// Assign to Project Modal
function AssignToProjectModal({
  projects,
  onClose,
  onSave,
  onCreateNew,
}: {
  projects: Project[];
  onClose: () => void;
  onSave: (projectId?: string) => void;
  onCreateNew: () => void;
}) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(
    projects[0]?.id
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-60" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-800 rounded-xl border border-slate-700 shadow-2xl z-60">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h3 className="font-medium text-slate-200">Analyse speichern</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {projects.length > 0 && (
            <div>
              <label className="block text-sm text-slate-400 mb-2">Zu Projekt hinzufügen:</label>
              <select
                value={selectedProjectId || ''}
                onChange={(e) => setSelectedProjectId(e.target.value || undefined)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200"
              >
                <option value="">Kein Projekt (nur Historie)</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={onCreateNew}
            className="w-full flex items-center justify-center gap-2 py-2 text-indigo-400 border border-slate-600 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            Neues Projekt erstellen
          </button>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={() => onSave(selectedProjectId)}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
            >
              Speichern
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
