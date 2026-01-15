import { VARIANT_TARGETS } from "../types/targets.js";

type VariantDimensions = {
  readonly width: number;
  readonly height: number;
};

function testCase(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    throw error;
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nReceived: ${actual}`);
  }
}

function assertArrayEqual<T>(actual: readonly T[], expected: readonly T[], message: string): void {
  const actualJoined = JSON.stringify(actual);
  const expectedJoined = JSON.stringify(expected);
  if (actualJoined !== expectedJoined) {
    throw new Error(`${message}\nExpected: ${expectedJoined}\nReceived: ${actualJoined}`);
  }
}

function getDimensions(targetId: string): VariantDimensions {
  const target = VARIANT_TARGETS.find((item) => item.id === targetId);
  if (!target) {
    throw new Error(`Target ${targetId} not found in VARIANT_TARGETS.`);
  }
  return { width: target.width, height: target.height };
}

testCase("includes all Phase 2 target identifiers", () => {
  const targetIds = VARIANT_TARGETS.map((target) => target.id);
  const expectedIds = [
    "figma-cover",
    "figma-gallery",
    "figma-thumbnail",
    "web-hero",
    "social-carousel",
    "youtube-cover",
    "tiktok-vertical",
    "youtube-shorts",
    "instagram-reels",
    "gumroad-cover",
    "gumroad-thumbnail",
    // Social Media & Ad Sizes
    "facebook-cover",
    "landscape-feed",
    "youtube-thumbnail",
    "youtube-video",
    "display-leaderboard",
    "display-rectangle"
  ];
  assertArrayEqual(targetIds, expectedIds, "VARIANT_TARGETS should include the Phase 2 catalog in order.");
});

testCase("exposes expected dimensions for new targets", () => {
  assertEqual(
    JSON.stringify(getDimensions("social-carousel")),
    JSON.stringify({ width: 1080, height: 1080 }),
    "Social carousel dimensions should be 1080×1080."
  );
  assertEqual(
    JSON.stringify(getDimensions("youtube-cover")),
    JSON.stringify({ width: 2560, height: 1440 }),
    "YouTube cover dimensions should be 2560×1440."
  );
  assertEqual(
    JSON.stringify(getDimensions("tiktok-vertical")),
    JSON.stringify({ width: 1080, height: 1920 }),
    "TikTok vertical dimensions should be 1080×1920."
  );
  assertEqual(
    JSON.stringify(getDimensions("gumroad-cover")),
    JSON.stringify({ width: 1280, height: 720 }),
    "Gumroad cover dimensions should be 1280×720."
  );
  assertEqual(
    JSON.stringify(getDimensions("gumroad-thumbnail")),
    JSON.stringify({ width: 600, height: 600 }),
    "Gumroad thumbnail dimensions should be 600×600."
  );
  // Social Media & Ad Sizes
  assertEqual(
    JSON.stringify(getDimensions("facebook-cover")),
    JSON.stringify({ width: 820, height: 312 }),
    "Facebook cover dimensions should be 820×312."
  );
  assertEqual(
    JSON.stringify(getDimensions("landscape-feed")),
    JSON.stringify({ width: 1200, height: 628 }),
    "Landscape feed dimensions should be 1200×628."
  );
  assertEqual(
    JSON.stringify(getDimensions("youtube-thumbnail")),
    JSON.stringify({ width: 1280, height: 720 }),
    "YouTube thumbnail dimensions should be 1280×720."
  );
  assertEqual(
    JSON.stringify(getDimensions("youtube-video")),
    JSON.stringify({ width: 1920, height: 1080 }),
    "YouTube video dimensions should be 1920×1080."
  );
  assertEqual(
    JSON.stringify(getDimensions("display-leaderboard")),
    JSON.stringify({ width: 728, height: 90 }),
    "Display leaderboard dimensions should be 728×90."
  );
  assertEqual(
    JSON.stringify(getDimensions("display-rectangle")),
    JSON.stringify({ width: 300, height: 250 }),
    "Display rectangle dimensions should be 300×250."
  );
});
