import type { VariantTarget } from "../types/targets.js";
import type { TargetQaThresholds } from "../types/ai-signals.js";
import { ASPECT_RATIOS } from "./layout-constants.js";

export interface TargetConfig {
  readonly safeAreaInsets?: { readonly top: number; readonly bottom: number; readonly left: number; readonly right: number };
  readonly overlayLabel: string;
  readonly overlayConstraints: FrameNode["constraints"];
}

/**
 * Platform-specific safe area configurations.
 *
 * SAFE AREA RATIONALE:
 * Each platform overlays UI chrome (buttons, captions, usernames) on top of content.
 * These insets define where content remains fully visible and unobstructed.
 *
 * ASYMMETRIC LEFT/RIGHT MARGINS:
 * - Left edge: Minimal UI (just edge proximity concerns)
 * - Right edge: Action buttons stack vertically (like, comment, share, bookmark)
 *   requiring ~120px clearance on all vertical video platforms
 *
 * CONSTRAINT MODES:
 * - STRETCH/MIN: Pins safe zone to top, stretches horizontally (for scrolling vertical content)
 * - SCALE: Proportional scaling (for fixed aspect ratio content)
 * - CENTER: Centered safe zone (for responsive banners like YouTube covers)
 *
 * VALUES LAST VERIFIED: January 2025
 * Sources: Platform design guidelines, community templates, manual UI measurement
 */
const SPECIFIC_CONFIGS: Record<string, Partial<TargetConfig>> = {
  /**
   * TikTok Vertical (1080×1920)
   *
   * TOP (150px / 7.8%):
   *   - Username display + follow button
   *   - "Following | For You" tab switcher proximity
   *   - Sound/music ticker can appear here
   *
   * BOTTOM (400px / 20.8%):
   *   - Caption text (can be multi-line, expandable)
   *   - @username and music/sound attribution
   *   - Home/Discover/+/Inbox/Profile tab bar (~100px)
   *   - Most aggressive bottom margin of all platforms
   *
   * LEFT (90px / 8.3%):
   *   - Slightly wider than Reels due to TikTok's UI density
   *   - Prevents text from feeling cramped against edge
   *
   * RIGHT (120px / 11.1%):
   *   - Like button + count
   *   - Comment button + count
   *   - Bookmark button
   *   - Share button
   *   - Creator avatar (floating, bottom-right)
   */
  "tiktok-vertical": {
     safeAreaInsets: { top: 150, bottom: 400, left: 90, right: 120 },
     overlayLabel: "Content Safe Zone",
     overlayConstraints: { horizontal: "STRETCH", vertical: "MIN" }
  },

  /**
   * YouTube Shorts (1080×1920)
   *
   * TOP (200px / 10.4%):
   *   - Channel name + subscribe button
   *   - "Shorts" branding overlay
   *   - Search and camera icons
   *   - More generous than TikTok/Reels for YouTube's header UI
   *
   * BOTTOM (280px / 14.6%):
   *   - Video title/description
   *   - Like/Dislike/Comment/Share buttons (horizontal row)
   *   - Navigation bar
   *   - Less aggressive than TikTok because buttons are horizontal, not stacked
   *
   * LEFT (60px / 5.6%):
   *   - Minimal chrome on left edge
   *   - Standard edge breathing room
   *
   * RIGHT (120px / 11.1%):
   *   - Vertical action buttons when in immersive mode
   *   - Channel avatar
   *   - "More" overflow menu
   */
  "youtube-shorts": {
     safeAreaInsets: { top: 200, bottom: 280, left: 60, right: 120 },
     overlayLabel: "Shorts Safe Zone",
     overlayConstraints: { horizontal: "STRETCH", vertical: "MIN" }
  },

  /**
   * Instagram Reels (1080×1920)
   *
   * TOP (108px / 5.6%):
   *   - "Reels" header text
   *   - Camera icon (top-right, but small)
   *   - Lightest top margin of the three vertical platforms
   *
   * BOTTOM (340px / 17.7%):
   *   - Username + follow button
   *   - Caption text (expandable)
   *   - Audio/music attribution
   *   - Home/Search/+/Reels/Profile tab bar
   *   - Note: Some sources suggest 320px; 340px is conservative
   *
   * LEFT (60px / 5.6%):
   *   - Minimal UI on left
   *   - Caption text starts here
   *
   * RIGHT (120px / 11.1%):
   *   - Like button + count (heart)
   *   - Comment button + count
   *   - Share/Send button
   *   - Bookmark/Save button
   *   - Three-dot menu
   *   - Audio disc animation (bottom-right corner)
   */
  "instagram-reels": {
     safeAreaInsets: { top: 108, bottom: 340, left: 60, right: 120 },
     overlayLabel: "Reels Safe Zone",
     overlayConstraints: { horizontal: "STRETCH", vertical: "MIN" }
  },

  /**
   * YouTube Channel Cover (2560×1440)
   *
   * No explicit pixel insets - uses ratio-based fallback.
   * YouTube's banner is responsive and crops differently on:
   *   - Desktop: Shows full width, crops top/bottom
   *   - Mobile: Shows center portion only
   *   - TV: Shows full image
   *
   * CENTER/CENTER constraints ensure the safe zone stays
   * centered regardless of how the banner is displayed.
   *
   * Recommended: Keep critical content in center 1546×423px
   * (the "safe area for text and logos" per YouTube guidelines)
   */
  "youtube-cover": {
      overlayLabel: "Text & Logo Safe Area",
      overlayConstraints: { horizontal: "CENTER", vertical: "CENTER" }
  }
};

/**
 * Target-specific QA thresholds for validating content fit.
 * Used by AI to generate target-aware warnings.
 */
export const TARGET_QA_THRESHOLDS: Record<string, TargetQaThresholds> = {
  "figma-cover": {
    targetId: "figma-cover",
    minFontSize: 14,
    maxTextLength: 200,
    minCtaSize: { width: 120, height: 40 },
    safeAreaCritical: false
  },
  "figma-gallery": {
    targetId: "figma-gallery",
    minFontSize: 14,
    maxTextLength: 180,
    minCtaSize: { width: 100, height: 36 },
    safeAreaCritical: false
  },
  "figma-thumbnail": {
    targetId: "figma-thumbnail",
    minFontSize: 9,
    maxTextLength: 80,
    minCtaSize: { width: 40, height: 20 },
    safeAreaCritical: false
  },
  "web-hero": {
    targetId: "web-hero",
    minFontSize: 16,
    maxTextLength: 150,
    minCtaSize: { width: 140, height: 44 },
    safeAreaCritical: false
  },
  "social-carousel": {
    targetId: "social-carousel",
    minFontSize: 14,
    maxTextLength: 120,
    minCtaSize: { width: 100, height: 40 },
    safeAreaCritical: false
  },
  "youtube-cover": {
    targetId: "youtube-cover",
    minFontSize: 18,
    maxTextLength: 150,
    minCtaSize: { width: 100, height: 36 },
    safeAreaCritical: true,
    overlayZones: [
      { x: 0, y: 1200, width: 2560, height: 240, description: "Bottom subscribe area" }
    ]
  },
  "tiktok-vertical": {
    targetId: "tiktok-vertical",
    minFontSize: 24,
    maxTextLength: 120,
    minCtaSize: { width: 200, height: 48 },
    safeAreaCritical: true,
    overlayZones: [
      { x: 0, y: 0, width: 1080, height: 150, description: "Username & sound" },
      { x: 0, y: 1520, width: 1080, height: 400, description: "Caption & actions" }
    ]
  },
  "youtube-shorts": {
    targetId: "youtube-shorts",
    minFontSize: 24,
    maxTextLength: 100,
    minCtaSize: { width: 180, height: 44 },
    safeAreaCritical: true,
    overlayZones: [
      { x: 0, y: 0, width: 1080, height: 200, description: "Channel & comments" },
      { x: 0, y: 1640, width: 1080, height: 280, description: "Subscribe & UI" }
    ]
  },
  "instagram-reels": {
    targetId: "instagram-reels",
    minFontSize: 22,
    maxTextLength: 110,
    minCtaSize: { width: 180, height: 44 },
    safeAreaCritical: true,
    overlayZones: [
      { x: 0, y: 0, width: 1080, height: 108, description: "Username area" },
      { x: 0, y: 1580, width: 1080, height: 340, description: "Caption & actions" }
    ]
  },
  "gumroad-cover": {
    targetId: "gumroad-cover",
    minFontSize: 14,
    maxTextLength: 180,
    minCtaSize: { width: 120, height: 40 },
    safeAreaCritical: false
  },
  "gumroad-thumbnail": {
    targetId: "gumroad-thumbnail",
    minFontSize: 12,
    maxTextLength: 60,
    minCtaSize: { width: 60, height: 28 },
    safeAreaCritical: false
  }
};

export function resolveTargetConfig(target: VariantTarget): TargetConfig {
  const specific = SPECIFIC_CONFIGS[target.id];
  
  const aspectRatio = target.width / Math.max(target.height, 1);
  const isVerticalVideo = aspectRatio < ASPECT_RATIOS.EXTREME_VERTICAL;

  const baseConfig: TargetConfig = {
      overlayLabel: isVerticalVideo ? "Content Safe Zone" : "Safe Area",
      overlayConstraints: isVerticalVideo 
        ? { horizontal: "STRETCH", vertical: "STRETCH" }
        : { horizontal: "SCALE", vertical: "SCALE" }
  };
  
  return { ...baseConfig, ...specific };
}
