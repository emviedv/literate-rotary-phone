import type { LayoutProfile } from "./layout-profile.js";
import { ASPECT_RATIOS } from "./layout-constants.js";
import { debugFixLog } from "./debug.js";

type ContentMargins = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

/**
 * Normalizes content margins for extreme aspect ratio changes to improve layout adaptation.
 * When the source and target have significantly different aspect ratios, asymmetric margins
 * are adjusted to provide better balance and prevent content from being pushed to edges.
 */
export function normalizeContentMargins(
  margins: ContentMargins | null,
  sourceProfile: LayoutProfile,
  targetProfile: LayoutProfile,
  sourceAspectRatio: number,
  targetAspectRatio: number
): ContentMargins | null {
  if (!margins) {
    return null;
  }

  // Calculate aspect ratio change magnitude
  const aspectRatioChange = Math.abs(sourceAspectRatio - targetAspectRatio);
  const profileChanged = sourceProfile !== targetProfile;

  debugFixLog("margin normalization analysis", {
    sourceProfile,
    targetProfile,
    sourceAspectRatio: sourceAspectRatio.toFixed(3),
    targetAspectRatio: targetAspectRatio.toFixed(3),
    aspectRatioChange: aspectRatioChange.toFixed(3),
    profileChanged,
    originalMargins: margins
  });

  // Only normalize for significant aspect ratio changes or profile transitions
  const significantChange = aspectRatioChange > 1.0 || profileChanged;

  if (!significantChange) {
    return margins;
  }

  // Calculate margin asymmetry ratios
  const horizontalTotal = margins.left + margins.right;
  const verticalTotal = margins.top + margins.bottom;

  const horizontalAsymmetry = horizontalTotal > 0
    ? Math.abs(margins.left - margins.right) / horizontalTotal
    : 0;
  const verticalAsymmetry = verticalTotal > 0
    ? Math.abs(margins.top - margins.bottom) / verticalTotal
    : 0;

  // Threshold for resetting asymmetric margins (when one side is >2.5x the other)
  const asymmetryThreshold = 0.6; // 60% asymmetry = 80%/20% split or worse

  let normalizedMargins = { ...margins };

  // Horizontal margin normalization for extreme changes
  if (shouldNormalizeHorizontalMargins(targetProfile, horizontalAsymmetry, asymmetryThreshold)) {
    const avgHorizontal = horizontalTotal / 2;

    debugFixLog("normalizing horizontal margins", {
      original: { left: margins.left, right: margins.right },
      asymmetry: horizontalAsymmetry.toFixed(3),
      normalized: avgHorizontal.toFixed(1)
    });

    // Progressive normalization: blend original (25%) with normalized (75%)
    normalizedMargins.left = margins.left * 0.25 + avgHorizontal * 0.75;
    normalizedMargins.right = margins.right * 0.25 + avgHorizontal * 0.75;
  }

  // Vertical margin normalization for extreme changes
  if (shouldNormalizeVerticalMargins(targetProfile, verticalAsymmetry, asymmetryThreshold)) {
    debugFixLog("normalizing vertical margins", {
      original: { top: margins.top, bottom: margins.bottom },
      asymmetry: verticalAsymmetry.toFixed(3),
      targetProfile
    });

    if (targetProfile === "vertical") {
      // For vertical targets: less top margin for better stacking, more bottom breathing room
      const totalVertical = verticalTotal;
      normalizedMargins.top = margins.top * 0.25 + (totalVertical / 3) * 0.75;
      normalizedMargins.bottom = margins.bottom * 0.25 + (totalVertical * 2/3) * 0.75;
    } else {
      // For other targets: balanced vertical distribution
      const avgVertical = verticalTotal / 2;
      normalizedMargins.top = margins.top * 0.25 + avgVertical * 0.75;
      normalizedMargins.bottom = margins.bottom * 0.25 + avgVertical * 0.75;
    }
  }

  // Ensure no margins go negative (preserve minimum spacing)
  normalizedMargins.left = Math.max(normalizedMargins.left, 0);
  normalizedMargins.right = Math.max(normalizedMargins.right, 0);
  normalizedMargins.top = Math.max(normalizedMargins.top, 0);
  normalizedMargins.bottom = Math.max(normalizedMargins.bottom, 0);

  debugFixLog("margin normalization result", {
    original: margins,
    normalized: normalizedMargins,
    horizontalChange: Math.abs((normalizedMargins.left + normalizedMargins.right) - horizontalTotal),
    verticalChange: Math.abs((normalizedMargins.top + normalizedMargins.bottom) - verticalTotal)
  });

  return normalizedMargins;
}

/**
 * Determines if horizontal margins should be normalized based on target profile and asymmetry
 */
function shouldNormalizeHorizontalMargins(
  targetProfile: LayoutProfile,
  horizontalAsymmetry: number,
  threshold: number
): boolean {
  // Always normalize high asymmetry for horizontal targets (YouTube, web banners)
  if (targetProfile === "horizontal" && horizontalAsymmetry > threshold) {
    return true;
  }

  // Normalize moderate asymmetry for square targets to prevent edge-hugging
  if (targetProfile === "square" && horizontalAsymmetry > threshold * 0.8) {
    return true;
  }

  return false;
}

/**
 * Determines if vertical margins should be normalized based on target profile and asymmetry
 */
function shouldNormalizeVerticalMargins(
  targetProfile: LayoutProfile,
  verticalAsymmetry: number,
  threshold: number
): boolean {
  // Always normalize high asymmetry for vertical targets (TikTok, phone formats)
  if (targetProfile === "vertical" && verticalAsymmetry > threshold) {
    return true;
  }

  // Normalize moderate asymmetry for square targets
  if (targetProfile === "square" && verticalAsymmetry > threshold * 0.8) {
    return true;
  }

  return false;
}

/**
 * Resolves layout profile from dimensions for source profile detection
 */
export function resolveLayoutProfile(dimensions: { width: number; height: number }): LayoutProfile {
  const aspectRatio = dimensions.width / Math.max(dimensions.height, 1);

  if (aspectRatio < ASPECT_RATIOS.SQUARE_MIN) {
    return "vertical";
  } else if (aspectRatio > ASPECT_RATIOS.SQUARE_MAX) {
    return "horizontal";
  } else {
    return "square";
  }
}