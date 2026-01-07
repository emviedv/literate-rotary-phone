import { scaleStrokeWeight, scaleCornerRadius } from "../core/scaling-utils.js";

function assert(condition: boolean, message: string): void {
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

testCase("Scaling Standardization: Stroke weight follows consistent power curve", () => {
  const original = 10;
  const scale = 4;
  
  // We want a standard power of 0.7 for dampening
  // 10 * 4^0.7 = 26.39
  const expected = original * Math.pow(scale, 0.7);
  
  const result = scaleStrokeWeight(original, scale);
  
  const diff = Math.abs(result - expected);
  assert(diff < 0.1, `Expected ${expected.toFixed(2)}, got ${result.toFixed(2)}`);
});

testCase("Scaling Standardization: Corner radius follows consistent power curve", () => {
    const original = 20;
    const scale = 3;
    
    // Standard power 0.7
    // 20 * 3^0.7 = 20 * 2.157 = 43.15
    const expected = original * Math.pow(scale, 0.7);
    
    const result = scaleCornerRadius(original, scale, 1000, 1000); // large node limits
    
    const diff = Math.abs(result - expected);
    assert(diff < 0.1, `Expected ${expected.toFixed(2)}, got ${result.toFixed(2)}`);
});