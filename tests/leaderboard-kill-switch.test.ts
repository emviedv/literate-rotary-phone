import {
  KILL_SWITCH_CONFIG,
  shouldActivateKillSwitch,
  isKillSwitchTarget,
  applyLeaderboardKillSwitch
} from "../core/leaderboard-kill-switch.js";
import type { VariantTarget } from "../types/targets.js";
import { ROLE_KEY } from "../core/plugin-constants.js";

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

// Mock target factory
function createTarget(id: string, width: number, height: number): VariantTarget {
  return {
    id,
    label: `Test ${id}`,
    description: `${width}x${height} test target`,
    width,
    height
  };
}

// Mock FrameNode factory for testing
interface MockNode {
  id: string;
  name: string;
  visible: boolean;
  pluginData: Map<string, string>;
  children?: MockNode[];
  getPluginData(key: string): string;
  setPluginData(key: string, value: string): void;
}

function createMockNode(
  id: string,
  name: string,
  role?: string,
  children?: MockNode[]
): MockNode {
  const pluginData = new Map<string, string>();
  if (role) {
    pluginData.set(ROLE_KEY, role);
  }
  return {
    id,
    name,
    visible: true,
    pluginData,
    children: children ?? [],
    getPluginData(key: string): string {
      return this.pluginData.get(key) || "";
    },
    setPluginData(key: string, value: string): void {
      this.pluginData.set(key, value);
    }
  };
}

function createMockFrame(
  id: string,
  name: string,
  children: MockNode[]
): MockNode {
  return createMockNode(id, name, undefined, children);
}

// === Configuration Tests ===

testCase("KILL_SWITCH_CONFIG has correct threshold", () => {
  assertEqual(
    KILL_SWITCH_CONFIG.HEIGHT_THRESHOLD,
    110,
    "Height threshold should be 110px"
  );
});

testCase("KILL_SWITCH_CONFIG includes expected roles", () => {
  const roles = [...KILL_SWITCH_CONFIG.ROLES_TO_HIDE];
  assertEqual(roles.includes("subject"), true, "Should include 'subject' role");
  assertEqual(roles.includes("hero_image"), true, "Should include 'hero_image' role");
  assertEqual(roles.includes("hero_bleed"), true, "Should include 'hero_bleed' role");
  assertEqual(roles.includes("hero"), true, "Should include 'hero' role");
});

// === shouldActivateKillSwitch Tests ===

testCase("shouldActivateKillSwitch returns true for height=90", () => {
  const target = createTarget("display-leaderboard", 728, 90);
  assertEqual(
    shouldActivateKillSwitch(target),
    true,
    "Kill-switch should activate for 90px height"
  );
});

testCase("shouldActivateKillSwitch returns true for height=109", () => {
  const target = createTarget("test-small", 300, 109);
  assertEqual(
    shouldActivateKillSwitch(target),
    true,
    "Kill-switch should activate for height just below threshold"
  );
});

testCase("shouldActivateKillSwitch returns false for height=110", () => {
  const target = createTarget("test-threshold", 300, 110);
  assertEqual(
    shouldActivateKillSwitch(target),
    false,
    "Kill-switch should NOT activate at exactly threshold"
  );
});

testCase("shouldActivateKillSwitch returns false for height=150", () => {
  const target = createTarget("test-large", 300, 150);
  assertEqual(
    shouldActivateKillSwitch(target),
    false,
    "Kill-switch should NOT activate for larger targets"
  );
});

testCase("shouldActivateKillSwitch respects custom config", () => {
  const target = createTarget("test-custom", 300, 200);
  const customConfig = {
    ...KILL_SWITCH_CONFIG,
    HEIGHT_THRESHOLD: 250
  } as unknown as typeof KILL_SWITCH_CONFIG;
  assertEqual(
    shouldActivateKillSwitch(target, customConfig),
    true,
    "Kill-switch should respect custom threshold"
  );
});

// === isKillSwitchTarget Tests ===

testCase("isKillSwitchTarget returns true for display-leaderboard", () => {
  assertEqual(
    isKillSwitchTarget("display-leaderboard"),
    true,
    "display-leaderboard should be a known kill-switch target"
  );
});

testCase("isKillSwitchTarget returns false for youtube-cover", () => {
  assertEqual(
    isKillSwitchTarget("youtube-cover"),
    false,
    "youtube-cover should NOT be a kill-switch target"
  );
});

testCase("isKillSwitchTarget returns false for unknown targets", () => {
  assertEqual(
    isKillSwitchTarget("unknown-target"),
    false,
    "Unknown targets should return false"
  );
});

// === applyLeaderboardKillSwitch Tests ===

testCase("applyLeaderboardKillSwitch hides subject nodes for small target", () => {
  const subject = createMockNode("node-1", "Person Photo", "subject");
  const text = createMockNode("node-2", "Title", "typography");
  const frame = createMockFrame("frame-1", "Test Frame", [subject, text]);

  const target = createTarget("display-leaderboard", 728, 90);
  const result = applyLeaderboardKillSwitch(frame as unknown as FrameNode, target, null);

  assertEqual(result.activated, true, "Kill-switch should activate");
  assertEqual(result.hiddenNodeIds.length, 1, "Should hide 1 node");
  assertEqual(result.hiddenNodeIds[0], "node-1", "Should hide the subject node");
  assertEqual(subject.visible, false, "Subject should be hidden");
  assertEqual(text.visible, true, "Typography should remain visible");
});

testCase("applyLeaderboardKillSwitch hides multiple hero roles", () => {
  const subject = createMockNode("node-1", "Person", "subject");
  const heroBleed = createMockNode("node-2", "Background", "hero_bleed");
  const heroImage = createMockNode("node-3", "Hero Image", "hero_image");
  const cta = createMockNode("node-4", "Buy Now", "action");
  const frame = createMockFrame("frame-1", "Test Frame", [subject, heroBleed, heroImage, cta]);

  const target = createTarget("display-leaderboard", 728, 90);
  const result = applyLeaderboardKillSwitch(frame as unknown as FrameNode, target, null);

  assertEqual(result.activated, true, "Kill-switch should activate");
  assertEqual(result.hiddenNodeIds.length, 3, "Should hide 3 nodes");
  assertEqual(subject.visible, false, "Subject should be hidden");
  assertEqual(heroBleed.visible, false, "Hero bleed should be hidden");
  assertEqual(heroImage.visible, false, "Hero image should be hidden");
  assertEqual(cta.visible, true, "Action should remain visible");
});

testCase("applyLeaderboardKillSwitch does nothing for large targets", () => {
  const subject = createMockNode("node-1", "Person Photo", "subject");
  const frame = createMockFrame("frame-1", "Test Frame", [subject]);

  const target = createTarget("youtube-cover", 2560, 1440);
  const result = applyLeaderboardKillSwitch(frame as unknown as FrameNode, target, null);

  assertEqual(result.activated, false, "Kill-switch should NOT activate");
  assertEqual(result.hiddenNodeIds.length, 0, "Should hide 0 nodes");
  assertEqual(subject.visible, true, "Subject should remain visible");
});

testCase("applyLeaderboardKillSwitch skips already-hidden nodes", () => {
  const subject = createMockNode("node-1", "Person Photo", "subject");
  subject.visible = false; // Already hidden
  const frame = createMockFrame("frame-1", "Test Frame", [subject]);

  const target = createTarget("display-leaderboard", 728, 90);
  const result = applyLeaderboardKillSwitch(frame as unknown as FrameNode, target, null);

  assertEqual(result.activated, true, "Kill-switch should activate");
  assertEqual(result.hiddenNodeIds.length, 0, "Should report 0 newly hidden nodes");
  assertEqual(subject.visible, false, "Subject should remain hidden");
});

testCase("applyLeaderboardKillSwitch finds nested subject nodes", () => {
  const nestedSubject = createMockNode("nested-1", "Nested Person", "subject");
  const container = createMockNode("container-1", "Container", "container", [nestedSubject]);
  const frame = createMockFrame("frame-1", "Test Frame", [container]);

  const target = createTarget("display-leaderboard", 728, 90);
  const result = applyLeaderboardKillSwitch(frame as unknown as FrameNode, target, null);

  assertEqual(result.activated, true, "Kill-switch should activate");
  assertEqual(result.hiddenNodeIds.length, 1, "Should hide 1 nested node");
  assertEqual(result.hiddenNodeIds[0], "nested-1", "Should hide the nested subject");
  assertEqual(nestedSubject.visible, false, "Nested subject should be hidden");
  assertEqual(container.visible, true, "Container should remain visible");
});

testCase("applyLeaderboardKillSwitch returns correct metadata", () => {
  const frame = createMockFrame("frame-1", "Test Frame", []);
  const target = createTarget("display-leaderboard", 728, 90);
  const result = applyLeaderboardKillSwitch(frame as unknown as FrameNode, target, null);

  assertEqual(result.targetHeight, 90, "Should report correct target height");
  assertEqual(result.threshold, 110, "Should report correct threshold");
});

testCase("applyLeaderboardKillSwitch handles frame with no children", () => {
  const frame = createMockFrame("frame-1", "Empty Frame", []);
  const target = createTarget("display-leaderboard", 728, 90);
  const result = applyLeaderboardKillSwitch(frame as unknown as FrameNode, target, null);

  assertEqual(result.activated, true, "Kill-switch should activate");
  assertEqual(result.hiddenNodeIds.length, 0, "Should hide 0 nodes (none to hide)");
});

testCase("applyLeaderboardKillSwitch handles nodes without plugin data accessor", () => {
  // Create a minimal mock without getPluginData method
  const minimalNode = {
    id: "minimal-1",
    name: "Minimal Node",
    visible: true,
    children: []
  };
  const frame = {
    id: "frame-1",
    name: "Frame",
    visible: true,
    children: [minimalNode],
    getPluginData: () => "",
    setPluginData: () => {}
  };

  const target = createTarget("display-leaderboard", 728, 90);
  // Should not throw
  const result = applyLeaderboardKillSwitch(frame as unknown as FrameNode, target, null);
  assertEqual(result.activated, true, "Kill-switch should activate");
  assertEqual(result.hiddenNodeIds.length, 0, "Should hide 0 nodes (no role data)");
});

console.log("\n✅ All leaderboard kill-switch tests passed!\n");
