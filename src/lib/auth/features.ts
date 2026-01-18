import { auth } from '@/lib/auth/config';
import { checkFeatureAccess } from './usage';

/**
 * Prüft ob User eingeloggt ist
 */
export async function requireLogin(): Promise<boolean> {
  const session = await auth();
  return !!session?.user?.id;
}

/**
 * Prüft ob ein Feature für User verfügbar ist
 */
export async function requireFeature(
  userId: string,
  feature: 'aiAnalysis' | 'aiChat' | 'exportPdf' | 'deepScan' | 'apiAccess'
): Promise<boolean> {
  return await checkFeatureAccess(userId, feature);
}

/**
 * Kombinierte Prüfung: Login + Feature
 */
export async function requireLoginAndFeature(
  feature: 'aiAnalysis' | 'aiChat' | 'exportPdf' | 'deepScan' | 'apiAccess'
): Promise<{ allowed: boolean; requiresLogin: boolean; requiresFeature: boolean }> {
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;
  
  if (!isLoggedIn || !session?.user?.id) {
    return {
      allowed: false,
      requiresLogin: true,
      requiresFeature: false,
    };
  }
  
  const hasFeature = await requireFeature(session.user.id, feature);
  
  return {
    allowed: hasFeature,
    requiresLogin: false,
    requiresFeature: !hasFeature,
  };
}
