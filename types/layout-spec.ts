/**
 * Layout Specification Types
 *
 * These types define the AI's output format. The AI analyzes a frame
 * and returns a specification for how to arrange elements in TikTok format.
 */

/**
 * Semantic roles the AI can assign to groups of related elements.
 * This allows the AI to identify visual relationships and keep related
 * elements together during TikTok layout transformation.
 */
export type SemanticRole =
  | "hero"        // Main headline/tagline
  | "product"     // Product mockup, screenshot, main image
  | "features"    // Feature list, benefits, bullet points
  | "cta"         // Call-to-action, website URL, button
  | "brand"       // Logo, brand mark
  | "metadata"    // Author, date, read time, secondary info
  | "decorative"; // Background elements, accents

/**
 * A group of semantically related elements.
 * The AI identifies these groups visually and assigns roles
 * to enable intelligent reordering while keeping related elements together.
 */
export interface SemanticGroup {
  /** Unique identifier (e.g., "group-1") */
  groupId: string;

  /** What this group represents semantically */
  role: SemanticRole;

  /** Figma node IDs belonging to this group */
  nodeIds: string[];

  /** Group's position in layout (lower = higher/first) */
  order: number;

  /** Whether entire group is visible in TikTok variant */
  visible: boolean;

  /** How children within this group should stack (optional override) */
  layoutDirection?: "VERTICAL" | "HORIZONTAL";

  /**
   * If true, preserve original spacing between nodes in this group.
   * The system will keep original X positions and center the composition
   * horizontally, rather than using AI-specified coordinates.
   *
   * Use for:
   * - Product mockup groups (phones side by side, device arrangements)
   * - Feature lists where icon-text gap rhythm matters
   * - Multi-element compositions that should scale as a unit
   */
  preserveSpacing?: boolean;
}

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

  /**
   * Layout direction for container nodes (FRAME or GROUP).
   * - "VERTICAL": Convert to vertical auto-layout (default)
   * - "HORIZONTAL": Convert to horizontal auto-layout
   * - "NONE": Keep as absolute positioning (for decorative overlays, badges)
   *
   * Only applies to nodes with children. Omit to use default (VERTICAL).
   */
  layoutDirection?: "VERTICAL" | "HORIZONTAL" | "NONE";

  /**
   * Positioning mode within parent auto-layout.
   * - "AUTO": Normal auto-layout flow positioning (default)
   * - "ABSOLUTE": Break out of auto-layout, use x/y coordinates
   *
   * Use "ABSOLUTE" for elements that need precise placement
   * (floating badges, overlapping mockups, edge-bleeding elements).
   */
  positioning?: "AUTO" | "ABSOLUTE";

  /**
   * X coordinate relative to parent (only used when positioning: "ABSOLUTE").
   * Can be negative for off-frame/edge-bleeding effects.
   */
  x?: number;

  /**
   * Y coordinate relative to parent (only used when positioning: "ABSOLUTE").
   * Can be negative for off-frame/edge-bleeding effects.
   */
  y?: number;

  /**
   * Z-index for layer stacking order.
   * Higher values appear in front of lower values.
   * Only meaningful when multiple siblings have zIndex set.
   */
  zIndex?: number;

  // ============================================
  // Phase 2: Advanced Transforms
  // ============================================

  /**
   * Rotation angle in degrees.
   * Positive values rotate counterclockwise (Figma convention).
   * Use for dynamic tilted compositions (e.g., phone at -15° angle).
   */
  rotation?: number;

  /**
   * Whether to lock aspect ratio when scaling.
   * When true, scaleFactor applies uniformly to both dimensions.
   * When false (default), width and height can scale independently.
   */
  aspectLocked?: boolean;

  /**
   * Target width after scaling (only used with aspectLocked).
   * If aspectLocked is true and targetWidth is set, the element
   * scales to this width while maintaining aspect ratio.
   */
  targetWidth?: number;

  /**
   * Target height after scaling (only used with aspectLocked).
   * If aspectLocked is true and targetHeight is set, the element
   * scales to this height while maintaining aspect ratio.
   */
  targetHeight?: number;

  /**
   * Anchor point for responsive positioning.
   * Determines how the element positions relative to its parent frame.
   * Only meaningful for absolutely positioned elements.
   *
   * horizontal: "LEFT" | "CENTER" | "RIGHT" - horizontal anchor
   * vertical: "TOP" | "CENTER" | "BOTTOM" - vertical anchor
   *
   * Example: { horizontal: "RIGHT", vertical: "BOTTOM" }
   * positions element relative to bottom-right corner.
   */
  anchor?: {
    horizontal: "LEFT" | "CENTER" | "RIGHT";
    vertical: "TOP" | "CENTER" | "BOTTOM";
  };
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

  /**
   * Whether to clip content that overflows frame bounds.
   * - true (default): Content is clipped at frame edges
   * - false: Content can visually extend beyond frame (bleed effects)
   *
   * Set to false when elements should extend beyond the frame edges
   * for dramatic visual effects (phone mockups bleeding off-screen, etc).
   */
  clipContent?: boolean;
}

/**
 * Complete layout specification returned by the AI
 */
export interface LayoutSpec {
  /**
   * Semantic groups that determine element ordering.
   * Groups keep related elements together (e.g., headline + subhead).
   * Optional for backward compatibility - if empty/missing, falls back to nodes-only.
   */
  semanticGroups?: SemanticGroup[];

  /** Specifications for each node (sizing, scale, individual overrides) */
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

  /**
   * Layout mode for FRAME nodes.
   * - "NONE": Absolute positioning (no auto-layout)
   * - "HORIZONTAL": Horizontal auto-layout
   * - "VERTICAL": Vertical auto-layout
   * - "GRID": Grid layout (treated same as auto-layout for reordering)
   */
  layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL" | "GRID";

  /**
   * True if this node is a GROUP (which cannot have auto-layout).
   * Groups are converted to Frames before applying auto-layout.
   */
  isGroup?: boolean;
}
