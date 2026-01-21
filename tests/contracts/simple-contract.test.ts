import { FEW_SHOT_MESSAGES } from '../../core/ai-few-shot-examples.js';

function testCase(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    throw error;
  }
}

testCase("FEW_SHOT_MESSAGES exports correctly", () => {
  if (!Array.isArray(FEW_SHOT_MESSAGES)) {
    throw new Error("Should be array");
  }
  if (FEW_SHOT_MESSAGES.length === 0) {
    throw new Error("Should not be empty");
  }
});