import { Prisma } from '@prisma/client';
import type { AnalysisResult, Issue } from '@/types';

function isJsonObject(value: Prisma.JsonValue): value is Prisma.JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function analysisResultFromJson(value: Prisma.JsonValue): AnalysisResult | null {
  if (!isJsonObject(value)) {
    return null;
  }

  return value as unknown as AnalysisResult;
}

export function analysisResultToJson(value: AnalysisResult): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

export function getAnalysisScoreFromJson(value: Prisma.JsonValue): number | null {
  const result = analysisResultFromJson(value);
  return typeof result?.score === 'number' ? result.score : null;
}

export function getAnalysisIssuesFromJson(value: Prisma.JsonValue): Issue[] {
  const result = analysisResultFromJson(value);
  return Array.isArray(result?.issues) ? result.issues : [];
}
