export type AnalyzerBrowserRuntime = 'puppeteer' | 'serverless-chromium';

export function isVercelServerlessRuntime(): boolean {
  return process.env.VERCEL === '1' || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export function getAnalyzerBrowserRuntime(): AnalyzerBrowserRuntime {
  return isVercelServerlessRuntime() ? 'serverless-chromium' : 'puppeteer';
}

export function getDeploymentEnvironment(): string {
  if (isVercelServerlessRuntime()) {
    return `vercel-${process.env.VERCEL_ENV ?? 'serverless'}`;
  }

  if (process.env.NODE_ENV === 'development') {
    return 'local-dev';
  }

  return process.env.NODE_ENV || 'server';
}

export function getBuildId(): string {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
    process.env.GIT_COMMIT_SHA?.slice(0, 7) ||
    'local-dev'
  );
}

export function getExecutionRegion(): string | undefined {
  return process.env.VERCEL_REGION || undefined;
}

export function getNextAuthSecret(): string | undefined {
  if (process.env.NEXTAUTH_SECRET) {
    return process.env.NEXTAUTH_SECRET;
  }

  if (!isVercelServerlessRuntime()) {
    return 'tracking-checker-local-dev-secret';
  }

  return undefined;
}
