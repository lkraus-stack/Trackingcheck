import { AnalysisResult, CachedAnalysis, AnalysisHistoryItem } from '@/types';

// Cache-Dauer: 24 Stunden
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;
const HISTORY_MAX_ITEMS = 50;

// Server-Side Cache (In-Memory für Vercel Serverless)
const memoryCache: Map<string, CachedAnalysis> = new Map();

// Cache-Key generieren
function getCacheKey(url: string): string {
  // URL normalisieren
  let normalizedUrl = url.trim().toLowerCase();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }
  try {
    const urlObj = new URL(normalizedUrl);
    // Nur Host und Pfad verwenden (ohne Query-Parameter für Cache)
    return `${urlObj.host}${urlObj.pathname}`.replace(/\/$/, '');
  } catch {
    return normalizedUrl;
  }
}

// Server-Side Cache Operationen
export function getCachedAnalysis(url: string): AnalysisResult | null {
  const cacheKey = getCacheKey(url);
  const cached = memoryCache.get(cacheKey);
  
  if (cached && cached.expiresAt > Date.now()) {
    console.log(`Cache hit for ${cacheKey}`);
    return cached.result;
  }
  
  // Abgelaufenen Cache entfernen
  if (cached) {
    memoryCache.delete(cacheKey);
  }
  
  return null;
}

export function setCachedAnalysis(url: string, result: AnalysisResult): void {
  const cacheKey = getCacheKey(url);
  const now = Date.now();
  
  memoryCache.set(cacheKey, {
    result,
    timestamp: now,
    expiresAt: now + CACHE_DURATION_MS,
  });
  
  console.log(`Cached analysis for ${cacheKey}`);
  
  // Cache-Größe begrenzen
  if (memoryCache.size > 100) {
    // Älteste Einträge entfernen
    const entries = Array.from(memoryCache.entries());
    entries
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, 20)
      .forEach(([key]) => memoryCache.delete(key));
  }
}

export function clearCache(url?: string): void {
  if (url) {
    const cacheKey = getCacheKey(url);
    memoryCache.delete(cacheKey);
  } else {
    memoryCache.clear();
  }
}

// Client-Side History Operationen (für LocalStorage)
export function getAnalysisHistory(): AnalysisHistoryItem[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem('tracking-checker-history');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading history:', error);
  }
  
  return [];
}

export function addToHistory(result: AnalysisResult): void {
  if (typeof window === 'undefined') return;
  
  try {
    const history = getAnalysisHistory();
    
    // Neuen Eintrag erstellen
    const newItem: AnalysisHistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: result.url,
      timestamp: result.timestamp,
      score: result.score,
      status: result.status === 'pending' ? 'success' : result.status,
      summary: {
        cookieBannerDetected: result.cookieBanner.detected,
        consentModeVersion: result.googleConsentMode.version,
        trackingTagsCount: [
          result.trackingTags.googleAnalytics.detected,
          result.trackingTags.googleTagManager.detected,
          result.trackingTags.metaPixel.detected,
          result.trackingTags.linkedInInsight.detected,
          result.trackingTags.tiktokPixel.detected,
        ].filter(Boolean).length + result.trackingTags.other.length,
        issuesCount: result.issues.length,
        gdprScore: result.gdprChecklist?.score || 0,
      },
    };
    
    // Duplikate entfernen (gleiche URL)
    const filteredHistory = history.filter(item => item.url !== result.url);
    
    // Neuen Eintrag an den Anfang setzen
    const updatedHistory = [newItem, ...filteredHistory].slice(0, HISTORY_MAX_ITEMS);
    
    localStorage.setItem('tracking-checker-history', JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Error saving to history:', error);
  }
}

export function removeFromHistory(id: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const history = getAnalysisHistory();
    const updatedHistory = history.filter(item => item.id !== id);
    localStorage.setItem('tracking-checker-history', JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Error removing from history:', error);
  }
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem('tracking-checker-history');
  } catch (error) {
    console.error('Error clearing history:', error);
  }
}

// Vergleich zweier Analysen
export function compareAnalyses(
  current: AnalysisResult,
  previous: AnalysisResult
): {
  scoreChange: number;
  newIssues: string[];
  resolvedIssues: string[];
  trackingChanges: string[];
} {
  const scoreChange = current.score - previous.score;
  
  // Issue-Vergleich
  const currentIssueTitles = new Set(current.issues.map(i => i.title));
  const previousIssueTitles = new Set(previous.issues.map(i => i.title));
  
  const newIssues = current.issues
    .filter(i => !previousIssueTitles.has(i.title))
    .map(i => i.title);
  
  const resolvedIssues = previous.issues
    .filter(i => !currentIssueTitles.has(i.title))
    .map(i => i.title);
  
  // Tracking-Änderungen
  const trackingChanges: string[] = [];
  
  if (current.trackingTags.googleAnalytics.detected !== previous.trackingTags.googleAnalytics.detected) {
    trackingChanges.push(
      current.trackingTags.googleAnalytics.detected
        ? 'Google Analytics hinzugefügt'
        : 'Google Analytics entfernt'
    );
  }
  
  if (current.trackingTags.metaPixel.detected !== previous.trackingTags.metaPixel.detected) {
    trackingChanges.push(
      current.trackingTags.metaPixel.detected
        ? 'Meta Pixel hinzugefügt'
        : 'Meta Pixel entfernt'
    );
  }
  
  if (current.googleConsentMode.version !== previous.googleConsentMode.version) {
    if (current.googleConsentMode.version === 'v2' && previous.googleConsentMode.version === 'v1') {
      trackingChanges.push('Consent Mode auf v2 aktualisiert');
    } else if (current.googleConsentMode.detected && !previous.googleConsentMode.detected) {
      trackingChanges.push('Consent Mode implementiert');
    }
  }
  
  return {
    scoreChange,
    newIssues,
    resolvedIssues,
    trackingChanges,
  };
}
