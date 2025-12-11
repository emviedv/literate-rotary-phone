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

testCase("vertical targets favor height when taller than wide", () => {
  const scale = calculateOptimalScale(baseAnalysis, { width: 1080, height: 1920 }, { left: 0, right: 0, top: 0, bottom: 0 }, "vertical");
  const widthScale = 1080 / baseAnalysis.effectiveWidth; // 2.16
  assert(scale > widthScale, "Vertical scaling should at least exceed width-based scale to use height");
});
