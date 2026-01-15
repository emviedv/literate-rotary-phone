/**
 * Adaptive Confidence Calibration System
 * Learns from user feedback to improve layout recommendation accuracy and acceptance rates.
 *
 * Key Features:
 * - Tracks user selection patterns vs AI recommendations
 * - Dynamic affinity weight adjustment (replaces fixed 0.1 boost)
 * - Per-target pattern success rate tracking
 * - Confidence score calibration using historical data
 * - Continuous learning from plugin usage
 */

declare const figma: PluginAPI;

import { debugFixLog } from "./debug.js";
import type { LayoutPatternId } from "../types/layout-patterns.js";
import type { AiRole } from "../types/ai-signals.js";
import type { TargetId } from "../types/targets.js";

/**
 * Confidence calibration data structure for learning from user feedback.
 */
export interface ConfidenceCalibration {
  // Pattern accuracy tracking
  readonly patternAccuracy: Record<LayoutPatternId, {
    readonly recommended: number;    // Times AI recommended this pattern
    readonly selected: number;       // Times user selected this pattern
    readonly accuracy: number;       // selected / recommended ratio
    readonly lastUpdated: number;    // Timestamp of last update
  }>;

  // Role classification accuracy
  readonly roleAccuracy: Record<AiRole, {
    readonly predictions: number;    // Times AI assigned this role
    readonly confirmations: number;  // Times user accepted/didn't override
    readonly accuracy: number;       // confirmations / predictions ratio
    readonly confidence: number;     // Current confidence multiplier
  }>;

  // Target-specific pattern success rates
  readonly targetAffinityWeights: Record<TargetId, Record<LayoutPatternId, {
    readonly weight: number;         // Current affinity weight (replaces fixed 0.1)
    readonly successCount: number;   // Successful recommendations
    readonly totalCount: number;     // Total recommendations
    readonly trend: number;          // Recent trend direction (-1 to 1)
  }>>;

  // QA signal precision tracking
  readonly qaSignalPrecision: Record<string, {
    readonly alertsGenerated: number;  // QA signals generated
    readonly falsePositives: number;   // User dismissed/ignored alerts
    readonly precision: number;       // (alerts - false positives) / alerts
    readonly severity: "low" | "medium" | "high";
  }>;

  // Overall calibration metadata
  readonly metadata: {
    readonly totalRecommendations: number;
    readonly userOverrideRate: number;      // How often user changes AI suggestions
    readonly averageConfidenceAccuracy: number;  // How well confidence scores predict user acceptance
    readonly lastCalibrationUpdate: number;
    readonly learningPhase: "initial" | "adapting" | "stable";
  };
}

/**
 * Default confidence calibration for new installations.
 */
const DEFAULT_CALIBRATION: ConfidenceCalibration = {
  patternAccuracy: {} as any,
  roleAccuracy: {} as any,
  targetAffinityWeights: {} as any,
  qaSignalPrecision: {} as any,
  metadata: {
    totalRecommendations: 0,
    userOverrideRate: 0,
    averageConfidenceAccuracy: 0,
    lastCalibrationUpdate: Date.now(),
    learningPhase: "initial"
  }
};

/**
 * Configuration for confidence calibration learning.
 */
const CALIBRATION_CONFIG = {
  MIN_SAMPLES_FOR_ADJUSTMENT: 10,     // Minimum data points before adjusting weights
  LEARNING_RATE: 0.1,                 // Rate of weight adjustment
  CONFIDENCE_DECAY: 0.95,             // Decay factor for old confidence scores
  MAX_AFFINITY_WEIGHT: 0.3,           // Maximum affinity boost
  MIN_AFFINITY_WEIGHT: -0.1,          // Minimum affinity (can be negative for poor patterns)
  TREND_WINDOW_DAYS: 7,               // Days to consider for trend calculation
  CALIBRATION_SAVE_INTERVAL: 300000   // 5 minutes between calibration saves
} as const;

/**
 * Loads confidence calibration data from plugin storage.
 */
export async function loadConfidenceCalibration(): Promise<ConfidenceCalibration> {
  try {
    const saved = figma.clientStorage.getAsync("scaleresizer:confidence-calibration");
    const savedData = await saved;

    if (savedData) {
      const parsed = JSON.parse(savedData) as ConfidenceCalibration;

      // Merge with defaults to handle new properties
      return mergeCalibrationDefaults(parsed);
    }
  } catch (error) {
    debugFixLog("Failed to load confidence calibration, using defaults", {
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return DEFAULT_CALIBRATION;
}

/**
 * Saves confidence calibration data to plugin storage.
 */
export async function saveConfidenceCalibration(calibration: ConfidenceCalibration): Promise<void> {
  try {
    const serialized = JSON.stringify(calibration);
    await figma.clientStorage.setAsync("scaleresizer:confidence-calibration", serialized);

    debugFixLog("Confidence calibration saved", {
      totalRecommendations: calibration.metadata.totalRecommendations,
      userOverrideRate: calibration.metadata.userOverrideRate,
      learningPhase: calibration.metadata.learningPhase
    });
  } catch (error) {
    debugFixLog("Failed to save confidence calibration", {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Records user feedback when they select a layout pattern.
 * This is the core learning mechanism for improving recommendations.
 */
export async function recordPatternSelection(
  targetId: TargetId,
  recommendedPatternId: LayoutPatternId,
  selectedPatternId: LayoutPatternId,
  aiConfidence: number
): Promise<void> {
  const calibration = await loadConfidenceCalibration();

  // Update pattern accuracy tracking
  if (!calibration.patternAccuracy[recommendedPatternId]) {
    (calibration as any).patternAccuracy[recommendedPatternId] = {
      recommended: 0,
      selected: 0,
      accuracy: 0,
      lastUpdated: Date.now()
    };
  }

  const patternStats = calibration.patternAccuracy[recommendedPatternId] as any;
  patternStats.recommended += 1;

  if (recommendedPatternId === selectedPatternId) {
    patternStats.selected += 1;
  }

  patternStats.accuracy = patternStats.selected / patternStats.recommended;
  patternStats.lastUpdated = Date.now();

  // Update target-specific affinity weights
  if (!calibration.targetAffinityWeights[targetId]) {
    (calibration as any).targetAffinityWeights[targetId] = {};
  }

  if (!calibration.targetAffinityWeights[targetId][selectedPatternId]) {
    (calibration as any).targetAffinityWeights[targetId][selectedPatternId] = {
      weight: 0,
      successCount: 0,
      totalCount: 0,
      trend: 0
    };
  }

  const affinityStats = calibration.targetAffinityWeights[targetId][selectedPatternId] as any;
  affinityStats.totalCount += 1;

  if (recommendedPatternId === selectedPatternId) {
    affinityStats.successCount += 1;
  }

  // Adjust affinity weight based on success rate
  const successRate = affinityStats.successCount / affinityStats.totalCount;

  if (affinityStats.totalCount >= CALIBRATION_CONFIG.MIN_SAMPLES_FOR_ADJUSTMENT) {
    const targetWeight = (successRate - 0.5) * CALIBRATION_CONFIG.MAX_AFFINITY_WEIGHT * 2;
    affinityStats.weight = Math.max(
      CALIBRATION_CONFIG.MIN_AFFINITY_WEIGHT,
      Math.min(CALIBRATION_CONFIG.MAX_AFFINITY_WEIGHT, targetWeight)
    );
  }

  // Update overall metadata
  const metadata = calibration.metadata as any;
  metadata.totalRecommendations += 1;

  const wasCorrect = recommendedPatternId === selectedPatternId ? 1 : 0;
  metadata.averageConfidenceAccuracy =
    (metadata.averageConfidenceAccuracy * (metadata.totalRecommendations - 1) + wasCorrect) /
    metadata.totalRecommendations;

  metadata.userOverrideRate = 1 - metadata.averageConfidenceAccuracy;
  metadata.lastCalibrationUpdate = Date.now();

  // Update learning phase based on data volume
  if (metadata.totalRecommendations < 50) {
    metadata.learningPhase = "initial";
  } else if (metadata.totalRecommendations < 200) {
    metadata.learningPhase = "adapting";
  } else {
    metadata.learningPhase = "stable";
  }

  await saveConfidenceCalibration(calibration as ConfidenceCalibration);

  debugFixLog("Pattern selection recorded", {
    targetId,
    recommendedPattern: recommendedPatternId,
    selectedPattern: selectedPatternId,
    wasCorrect: recommendedPatternId === selectedPatternId,
    newAccuracy: patternStats.accuracy,
    totalRecommendations: metadata.totalRecommendations
  });
}

/**
 * Gets calibrated affinity weight for a target-pattern combination.
 * Replaces the fixed 0.1 boost with learned weights.
 */
export async function getCalibratedAffinityWeight(
  targetId: TargetId,
  patternId: LayoutPatternId
): Promise<number> {
  const calibration = await loadConfidenceCalibration();

  const targetWeights = calibration.targetAffinityWeights[targetId];
  if (!targetWeights) {
    return 0; // No data yet, neutral weight
  }

  const patternWeight = targetWeights[patternId];
  if (!patternWeight) {
    return 0; // No data for this pattern, neutral weight
  }

  // Apply learning phase adjustment
  let adjustedWeight = patternWeight.weight;

  switch (calibration.metadata.learningPhase) {
    case "initial":
      // Conservative during initial learning
      adjustedWeight *= 0.5;
      break;
    case "adapting":
      // Gradual increase as we gain confidence
      adjustedWeight *= 0.8;
      break;
    case "stable":
      // Full weight for stable phase
      break;
  }

  return adjustedWeight;
}

/**
 * Records QA signal feedback when user dismisses or acts on warnings.
 */
export async function recordQASignalFeedback(
  qaCode: string,
  severity: "low" | "medium" | "high",
  userAction: "dismissed" | "acknowledged" | "acted_upon"
): Promise<void> {
  const calibration = await loadConfidenceCalibration();

  if (!calibration.qaSignalPrecision[qaCode]) {
    (calibration as any).qaSignalPrecision[qaCode] = {
      alertsGenerated: 0,
      falsePositives: 0,
      precision: 1.0,
      severity
    };
  }

  const qaStats = calibration.qaSignalPrecision[qaCode] as any;
  qaStats.alertsGenerated += 1;

  if (userAction === "dismissed") {
    qaStats.falsePositives += 1;
  }

  qaStats.precision = Math.max(0, 1 - (qaStats.falsePositives / qaStats.alertsGenerated));

  await saveConfidenceCalibration(calibration as ConfidenceCalibration);

  debugFixLog("QA signal feedback recorded", {
    qaCode,
    userAction,
    newPrecision: qaStats.precision,
    alertsGenerated: qaStats.alertsGenerated
  });
}

/**
 * Gets calibrated confidence multiplier for an AI role assignment.
 */
export async function getCalibratedRoleConfidence(role: AiRole): Promise<number> {
  const calibration = await loadConfidenceCalibration();

  const roleStats = calibration.roleAccuracy[role];
  if (!roleStats || roleStats.predictions < CALIBRATION_CONFIG.MIN_SAMPLES_FOR_ADJUSTMENT) {
    return 1.0; // No adjustment until we have enough data
  }

  // Adjust confidence based on historical accuracy
  const accuracyMultiplier = Math.sqrt(roleStats.accuracy); // Square root to avoid over-adjustment
  return Math.max(0.5, Math.min(1.2, accuracyMultiplier)); // Clamp between 0.5x and 1.2x
}

/**
 * Records role assignment feedback (implicit through user edits/overrides).
 */
export async function recordRoleAssignmentFeedback(
  role: AiRole,
  wasAccepted: boolean
): Promise<void> {
  const calibration = await loadConfidenceCalibration();

  if (!calibration.roleAccuracy[role]) {
    (calibration as any).roleAccuracy[role] = {
      predictions: 0,
      confirmations: 0,
      accuracy: 1.0,
      confidence: 1.0
    };
  }

  const roleStats = calibration.roleAccuracy[role] as any;
  roleStats.predictions += 1;

  if (wasAccepted) {
    roleStats.confirmations += 1;
  }

  roleStats.accuracy = roleStats.confirmations / roleStats.predictions;

  await saveConfidenceCalibration(calibration as ConfidenceCalibration);
}

/**
 * Gets comprehensive calibration status for debugging and analytics.
 */
export async function getCalibrationStatus(): Promise<{
  learningPhase: string;
  totalRecommendations: number;
  userOverrideRate: number;
  topPatterns: Array<{ pattern: LayoutPatternId; accuracy: number }>;
  topTargetWeights: Array<{ target: TargetId; pattern: LayoutPatternId; weight: number }>;
}> {
  const calibration = await loadConfidenceCalibration();

  // Extract top-performing patterns
  const topPatterns = Object.entries(calibration.patternAccuracy)
    .filter(([_, stats]) => stats.recommended >= 5) // Minimum sample size
    .map(([pattern, stats]) => ({ pattern: pattern as LayoutPatternId, accuracy: stats.accuracy }))
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 5);

  // Extract highest-weighted target-pattern combinations
  const topTargetWeights: Array<{ target: TargetId; pattern: LayoutPatternId; weight: number }> = [];

  for (const [target, patterns] of Object.entries(calibration.targetAffinityWeights)) {
    for (const [pattern, stats] of Object.entries(patterns)) {
      topTargetWeights.push({
        target: target as TargetId,
        pattern: pattern as LayoutPatternId,
        weight: stats.weight
      });
    }
  }

  topTargetWeights.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));

  return {
    learningPhase: calibration.metadata.learningPhase,
    totalRecommendations: calibration.metadata.totalRecommendations,
    userOverrideRate: calibration.metadata.userOverrideRate,
    topPatterns: topPatterns.slice(0, 5),
    topTargetWeights: topTargetWeights.slice(0, 10)
  };
}

/**
 * Merges saved calibration data with current defaults to handle schema evolution.
 */
function mergeCalibrationDefaults(saved: any): ConfidenceCalibration {
  return {
    patternAccuracy: saved.patternAccuracy || {},
    roleAccuracy: saved.roleAccuracy || {},
    targetAffinityWeights: saved.targetAffinityWeights || {},
    qaSignalPrecision: saved.qaSignalPrecision || {},
    metadata: {
      ...DEFAULT_CALIBRATION.metadata,
      ...saved.metadata
    }
  };
}

/**
 * Resets calibration data for testing or debugging purposes.
 * CAUTION: This permanently deletes all learned preferences.
 */
export async function resetCalibration(): Promise<void> {
  await saveConfidenceCalibration(DEFAULT_CALIBRATION);
  debugFixLog("Confidence calibration reset to defaults");
}