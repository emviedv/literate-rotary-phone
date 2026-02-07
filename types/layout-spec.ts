/**
 * Layout Specification Types
 *
 * These types define the AI's output format. The AI analyzes a frame
 * and returns a specification for how to arrange elements in TikTok format.
 */

/**
 * Sizing mode for elements within auto-layout
 * - FILL: Element expands to fill available space
 * - HUG: Element shrinks to fit its content
 * - FIXED: Element maintains a specific size
 */
export type SizingMode = "FILL" | "HUG" | "FIXED";

/**
 * Specification for a single node in the layout
 */
export interface NodeSpec {
  /** Figma node ID (e.g., "123:456") */
  nodeId: string;

  /** Human-readable node name for debugging */
  nodeName: string;

  /** Whether this node should be visible in the TikTok variant */
  visible: boolean;

  /**
   * Position in the layout flow (lower numbers appear first).
   * Used to reorder children within auto-layout containers.
   */
  order: number;

  /** Horizontal sizing behavior */
  widthSizing: SizingMode;

  /** Vertical sizing behavior */
  heightSizing: SizingMode;

  /**
   * Optional scale factor for this element (1.0 = original size).
   * Applied after sizing mode, useful for hero images or prominent text.
   */
  scaleFactor?: number;
}

/**
 * Root-level layout configuration for the TikTok variant
 */
export interface RootLayout {
  /** Layout direction (TikTok is always vertical) */
  direction: "VERTICAL";

  /** Padding from frame edges */
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };

  /** Gap between children in the layout */
  gap: number;

  /** How children align horizontally within the vertical layout */
  primaryAxisAlign: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";

  /** How children align on the cross axis */
  counterAxisAlign: "MIN" | "CENTER" | "MAX";
}

/**
 * Complete layout specification returned by the AI
 */
export interface LayoutSpec {
  /** Specifications for each node */
  nodes: NodeSpec[];

  /** Root frame layout configuration */
  rootLayout: RootLayout;

  /** Optional reasoning from the AI (for debugging) */
  reasoning?: string;
}

/**
 * Simplified node tree sent to the AI for analysis
 */
export interface NodeTreeItem {
  id: string;
  name: string;
  type: string;
  width: number;
  height: number;
  children?: NodeTreeItem[];
}
