import { calculateOptimalScale, type ContentAnalysis } from "../core/content-analyzer.js";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function testCase(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    throw error;
  }
}

const baseAnalysis: ContentAnalysis = {
  actualContentBounds: null,
  hasAutoLayout: true,
  layoutDirection: "HORIZONTAL",
  childCount: 2,
  hasText: true,
  hasImages: false,
  contentDensity: "normal",
  recommendedStrategy: "adaptive",
  effectiveWidth: 500,
  effectiveHeight: 400
};

testCase("vertical targets respect safe area constraint with allowed overshoot", () => {
  const scale = calculateOptimalScale(baseAnalysis, { width: 1080, height: 1920 }, { left: 0, right: 0, top: 0, bottom: 0 }, "vertical");
  const widthScale = 1080 / baseAnalysis.effectiveWidth; // 2.16
  const heightScale = 1920 / baseAnalysis.effectiveHeight; // 4.8
  // Safe area constraint caps scale to min(widthScale, heightScale) * 1.10 (10% overshoot allowed)
  const maxSafeScale = Math.min(widthScale, heightScale);
  const maxWithOvershoot = maxSafeScale * 1.10;
  assert(scale <= maxWithOvershoot, "Scale should not exceed safe area constraint plus 10% overshoot");
  assert(scale >= maxSafeScale * 0.9, "Scale should be close to the maximum allowed by safe area");
});
