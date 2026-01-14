// Project & Analysis Storage mit IndexedDB
// Persistente Speicherung von Projekten, Analysen und Vergleichen

import { AnalysisResult } from '@/types';

const DB_NAME = 'TrackingCheckerDB';
const DB_VERSION = 1;

// Store Names
const STORES = {
  PROJECTS: 'projects',
  ANALYSES: 'analyses',
  COMPARISONS: 'comparisons',
  SETTINGS: 'settings',
} as const;

// Types
export interface Project {
  id: string;
  name: string;
  description?: string;
  urls: string[];
  color: string;
  createdAt: string;
  updatedAt: string;
  lastAnalysis?: string;
  avgScore?: number;
  isFavorite: boolean;
  notes?: string;
  tags?: string[];
}

export interface StoredAnalysis {
  id: string;
  url: string;
  projectId?: string;
  result: AnalysisResult;
  createdAt: string;
  notes?: string;
  tags?: string[];
}

export interface AnalysisComparison {
  id: string;
  url: string;
  previousAnalysisId: string;
  currentAnalysisId: string;
  changes: ComparisonChange[];
  createdAt: string;
}

export interface ComparisonChange {
  category: string;
  field: string;
  previousValue: unknown;
  currentValue: unknown;
  changeType: 'improved' | 'degraded' | 'unchanged' | 'new' | 'removed';
  impact: 'positive' | 'negative' | 'neutral';
}

export interface StorageStats {
  totalProjects: number;
  totalAnalyses: number;
  totalUrls: number;
  avgScore: number;
  lastAnalysisDate?: string;
  topIssues: { issue: string; count: number }[];
}

// IndexedDB Helper
let dbInstance: IDBDatabase | null = null;

async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Projects Store
      if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
        const projectStore = db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
        projectStore.createIndex('name', 'name', { unique: false });
        projectStore.createIndex('isFavorite', 'isFavorite', { unique: false });
        projectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // Analyses Store
      if (!db.objectStoreNames.contains(STORES.ANALYSES)) {
        const analysisStore = db.createObjectStore(STORES.ANALYSES, { keyPath: 'id' });
        analysisStore.createIndex('url', 'url', { unique: false });
        analysisStore.createIndex('projectId', 'projectId', { unique: false });
        analysisStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Comparisons Store
      if (!db.objectStoreNames.contains(STORES.COMPARISONS)) {
        const comparisonStore = db.createObjectStore(STORES.COMPARISONS, { keyPath: 'id' });
        comparisonStore.createIndex('url', 'url', { unique: false });
        comparisonStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Settings Store
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
    };
  });
}

// Generic CRUD Operations
async function addItem<T>(storeName: string, item: T): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.add(item);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function updateItem<T>(storeName: string, item: T): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function getItem<T>(storeName: string, id: string): Promise<T | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function getAllItems<T>(storeName: string): Promise<T[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function deleteItem(storeName: string, id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function getItemsByIndex<T>(storeName: string, indexName: string, value: IDBValidKey): Promise<T[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Project Operations
export async function createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
  const newProject: Project = {
    ...project,
    id: `project_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await addItem(STORES.PROJECTS, newProject);
  return newProject;
}

export async function updateProject(project: Project): Promise<void> {
  await updateItem(STORES.PROJECTS, {
    ...project,
    updatedAt: new Date().toISOString(),
  });
}

export async function getProject(id: string): Promise<Project | undefined> {
  return getItem<Project>(STORES.PROJECTS, id);
}

export async function getAllProjects(): Promise<Project[]> {
  const projects = await getAllItems<Project>(STORES.PROJECTS);
  return projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getFavoriteProjects(): Promise<Project[]> {
  return getItemsByIndex<Project>(STORES.PROJECTS, 'isFavorite', 1);
}

export async function deleteProject(id: string): Promise<void> {
  // Also delete all analyses for this project
  const analyses = await getAnalysesByProject(id);
  for (const analysis of analyses) {
    await deleteAnalysis(analysis.id);
  }
  await deleteItem(STORES.PROJECTS, id);
}

export async function toggleProjectFavorite(id: string): Promise<Project | undefined> {
  const project = await getProject(id);
  if (project) {
    project.isFavorite = !project.isFavorite;
    await updateProject(project);
    return project;
  }
  return undefined;
}

// Analysis Operations
export async function saveAnalysis(
  result: AnalysisResult,
  projectId?: string,
  notes?: string
): Promise<StoredAnalysis> {
  const analysis: StoredAnalysis = {
    id: `analysis_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    url: result.url,
    projectId,
    result,
    createdAt: new Date().toISOString(),
    notes,
  };
  await addItem(STORES.ANALYSES, analysis);

  // Update project if assigned
  if (projectId) {
    const project = await getProject(projectId);
    if (project) {
      if (!project.urls.includes(result.url)) {
        project.urls.push(result.url);
      }
      project.lastAnalysis = analysis.createdAt;
      
      // Calculate average score
      const projectAnalyses = await getAnalysesByProject(projectId);
      const scores = projectAnalyses.map(a => a.result.score);
      project.avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      
      await updateProject(project);
    }
  }

  return analysis;
}

export async function getAnalysis(id: string): Promise<StoredAnalysis | undefined> {
  return getItem<StoredAnalysis>(STORES.ANALYSES, id);
}

export async function getAllAnalyses(): Promise<StoredAnalysis[]> {
  const analyses = await getAllItems<StoredAnalysis>(STORES.ANALYSES);
  return analyses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getAnalysesByUrl(url: string): Promise<StoredAnalysis[]> {
  const analyses = await getItemsByIndex<StoredAnalysis>(STORES.ANALYSES, 'url', url);
  return analyses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getAnalysesByProject(projectId: string): Promise<StoredAnalysis[]> {
  const analyses = await getItemsByIndex<StoredAnalysis>(STORES.ANALYSES, 'projectId', projectId);
  return analyses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function deleteAnalysis(id: string): Promise<void> {
  await deleteItem(STORES.ANALYSES, id);
}

export async function getLatestAnalysisForUrl(url: string): Promise<StoredAnalysis | undefined> {
  const analyses = await getAnalysesByUrl(url);
  return analyses[0];
}

// Comparison Operations
export function compareAnalyses(previous: AnalysisResult, current: AnalysisResult): ComparisonChange[] {
  const changes: ComparisonChange[] = [];

  // Score comparison
  if (previous.score !== current.score) {
    changes.push({
      category: 'overall',
      field: 'score',
      previousValue: previous.score,
      currentValue: current.score,
      changeType: current.score > previous.score ? 'improved' : 'degraded',
      impact: current.score > previous.score ? 'positive' : 'negative',
    });
  }

  // Cookie Banner
  if (previous.cookieBanner.detected !== current.cookieBanner.detected) {
    changes.push({
      category: 'cookieBanner',
      field: 'detected',
      previousValue: previous.cookieBanner.detected,
      currentValue: current.cookieBanner.detected,
      changeType: current.cookieBanner.detected ? 'improved' : 'degraded',
      impact: current.cookieBanner.detected ? 'positive' : 'negative',
    });
  }

  if (previous.cookieBanner.hasRejectButton !== current.cookieBanner.hasRejectButton) {
    changes.push({
      category: 'cookieBanner',
      field: 'hasRejectButton',
      previousValue: previous.cookieBanner.hasRejectButton,
      currentValue: current.cookieBanner.hasRejectButton,
      changeType: current.cookieBanner.hasRejectButton ? 'improved' : 'degraded',
      impact: current.cookieBanner.hasRejectButton ? 'positive' : 'negative',
    });
  }

  // Google Consent Mode
  if (previous.googleConsentMode.detected !== current.googleConsentMode.detected) {
    changes.push({
      category: 'googleConsentMode',
      field: 'detected',
      previousValue: previous.googleConsentMode.detected,
      currentValue: current.googleConsentMode.detected,
      changeType: current.googleConsentMode.detected ? 'improved' : 'degraded',
      impact: current.googleConsentMode.detected ? 'positive' : 'negative',
    });
  }

  if (previous.googleConsentMode.version !== current.googleConsentMode.version) {
    changes.push({
      category: 'googleConsentMode',
      field: 'version',
      previousValue: previous.googleConsentMode.version,
      currentValue: current.googleConsentMode.version,
      changeType: current.googleConsentMode.version === 'v2' ? 'improved' : 'degraded',
      impact: current.googleConsentMode.version === 'v2' ? 'positive' : 'negative',
    });
  }

  // TCF
  if (previous.tcf.detected !== current.tcf.detected) {
    changes.push({
      category: 'tcf',
      field: 'detected',
      previousValue: previous.tcf.detected,
      currentValue: current.tcf.detected,
      changeType: current.tcf.detected ? 'improved' : 'degraded',
      impact: current.tcf.detected ? 'positive' : 'negative',
    });
  }

  // Tracking Tags Count
  const prevTrackingCount = countTrackingTags(previous.trackingTags);
  const currTrackingCount = countTrackingTags(current.trackingTags);
  if (prevTrackingCount !== currTrackingCount) {
    changes.push({
      category: 'trackingTags',
      field: 'count',
      previousValue: prevTrackingCount,
      currentValue: currTrackingCount,
      changeType: currTrackingCount !== prevTrackingCount ? 'improved' : 'unchanged',
      impact: 'neutral',
    });
  }

  // Cookies Count
  if (previous.cookies.length !== current.cookies.length) {
    changes.push({
      category: 'cookies',
      field: 'count',
      previousValue: previous.cookies.length,
      currentValue: current.cookies.length,
      changeType: current.cookies.length !== previous.cookies.length ? 'improved' : 'unchanged',
      impact: 'neutral',
    });
  }

  // Issues Count
  const prevErrors = previous.issues.filter(i => i.severity === 'error').length;
  const currErrors = current.issues.filter(i => i.severity === 'error').length;
  if (prevErrors !== currErrors) {
    changes.push({
      category: 'issues',
      field: 'errorCount',
      previousValue: prevErrors,
      currentValue: currErrors,
      changeType: currErrors < prevErrors ? 'improved' : 'degraded',
      impact: currErrors < prevErrors ? 'positive' : 'negative',
    });
  }

  // GDPR Score
  if (previous.gdprChecklist?.score !== current.gdprChecklist?.score) {
    changes.push({
      category: 'gdpr',
      field: 'score',
      previousValue: previous.gdprChecklist?.score,
      currentValue: current.gdprChecklist?.score,
      changeType: (current.gdprChecklist?.score || 0) > (previous.gdprChecklist?.score || 0) ? 'improved' : 'degraded',
      impact: (current.gdprChecklist?.score || 0) > (previous.gdprChecklist?.score || 0) ? 'positive' : 'negative',
    });
  }

  // Cookie Consent Test
  if (previous.cookieConsentTest && current.cookieConsentTest) {
    if (previous.cookieConsentTest.analysis.trackingBeforeConsent !== current.cookieConsentTest.analysis.trackingBeforeConsent) {
      changes.push({
        category: 'cookieConsentTest',
        field: 'trackingBeforeConsent',
        previousValue: previous.cookieConsentTest.analysis.trackingBeforeConsent,
        currentValue: current.cookieConsentTest.analysis.trackingBeforeConsent,
        changeType: !current.cookieConsentTest.analysis.trackingBeforeConsent ? 'improved' : 'degraded',
        impact: !current.cookieConsentTest.analysis.trackingBeforeConsent ? 'positive' : 'negative',
      });
    }
  }

  return changes;
}

function countTrackingTags(trackingTags: AnalysisResult['trackingTags']): number {
  return [
    trackingTags.googleAnalytics.detected,
    trackingTags.googleTagManager.detected,
    trackingTags.metaPixel.detected,
    trackingTags.linkedInInsight.detected,
    trackingTags.tiktokPixel.detected,
    trackingTags.pinterestTag?.detected,
    trackingTags.snapchatPixel?.detected,
    trackingTags.twitterPixel?.detected,
    trackingTags.bingAds?.detected,
    trackingTags.criteo?.detected,
  ].filter(Boolean).length + trackingTags.other.length;
}

export async function saveComparison(
  url: string,
  previousAnalysisId: string,
  currentAnalysisId: string,
  changes: ComparisonChange[]
): Promise<AnalysisComparison> {
  const comparison: AnalysisComparison = {
    id: `comparison_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    url,
    previousAnalysisId,
    currentAnalysisId,
    changes,
    createdAt: new Date().toISOString(),
  };
  await addItem(STORES.COMPARISONS, comparison);
  return comparison;
}

export async function getComparisonsForUrl(url: string): Promise<AnalysisComparison[]> {
  return getItemsByIndex<AnalysisComparison>(STORES.COMPARISONS, 'url', url);
}

// Statistics
export async function getStorageStats(): Promise<StorageStats> {
  const projects = await getAllProjects();
  const analyses = await getAllAnalyses();

  const allUrls = new Set<string>();
  analyses.forEach(a => allUrls.add(a.url));

  const scores = analyses.map(a => a.result.score);
  const avgScore = scores.length > 0 
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  // Count issues
  const issueCounts: Record<string, number> = {};
  analyses.forEach(a => {
    a.result.issues.forEach(issue => {
      const key = issue.title;
      issueCounts[key] = (issueCounts[key] || 0) + 1;
    });
  });

  const topIssues = Object.entries(issueCounts)
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalProjects: projects.length,
    totalAnalyses: analyses.length,
    totalUrls: allUrls.size,
    avgScore,
    lastAnalysisDate: analyses[0]?.createdAt,
    topIssues,
  };
}

// Export/Import
export async function exportAllData(): Promise<{
  projects: Project[];
  analyses: StoredAnalysis[];
  comparisons: AnalysisComparison[];
}> {
  return {
    projects: await getAllProjects(),
    analyses: await getAllAnalyses(),
    comparisons: await getAllItems<AnalysisComparison>(STORES.COMPARISONS),
  };
}

export async function importData(data: {
  projects?: Project[];
  analyses?: StoredAnalysis[];
  comparisons?: AnalysisComparison[];
}): Promise<void> {
  if (data.projects) {
    for (const project of data.projects) {
      await updateItem(STORES.PROJECTS, project);
    }
  }
  if (data.analyses) {
    for (const analysis of data.analyses) {
      await updateItem(STORES.ANALYSES, analysis);
    }
  }
  if (data.comparisons) {
    for (const comparison of data.comparisons) {
      await updateItem(STORES.COMPARISONS, comparison);
    }
  }
}

// Clear all data
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const transaction = db.transaction([STORES.PROJECTS, STORES.ANALYSES, STORES.COMPARISONS], 'readwrite');
  
  transaction.objectStore(STORES.PROJECTS).clear();
  transaction.objectStore(STORES.ANALYSES).clear();
  transaction.objectStore(STORES.COMPARISONS).clear();
}

// Project colors
export const PROJECT_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#a855f7', // Purple
  '#d946ef', // Fuchsia
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#eab308', // Yellow
  '#84cc16', // Lime
  '#22c55e', // Green
  '#10b981', // Emerald
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#0ea5e9', // Sky
  '#3b82f6', // Blue
];
