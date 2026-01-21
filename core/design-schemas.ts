/**
 * JSON Schema Definitions for OpenAI Structured Outputs
 *
 * These schemas enforce AI response structure at the API level,
 * eliminating the need for post-hoc structural validation.
 *
 * OpenAI Structured Outputs Requirements:
 * - `strict: true` guarantees schema adherence
 * - All properties must be in `required` array (strict mode)
 * - `additionalProperties: false` on all objects
 */

// ============================================================================
// Feature Flag for Rollback
// ============================================================================

/**
 * Feature flag for instant rollback to json_object mode.
 * Set to false to disable structured outputs and use legacy parsing.
 */
export const USE_STRUCTURED_OUTPUTS = true;

// ============================================================================
// Stage 1: Design Plan Schema
// ============================================================================

/**
 * JSON Schema for Stage 1: Vision Analysis & Design Planning
 *
 * AI outputs high-level strategy and element categorization.
 */
export const STAGE_1_SCHEMA = {
  name: "stage1_design_plan",
  strict: true,
  schema: {
    type: "object",
    required: [
      "designStrategy",
      "reasoning",
      "visualInventory",
      "neverHide",
      "designAnalysis",
      "elements",
      "layoutZones",
      "focalPoints"
    ],
    additionalProperties: false,
    properties: {
      designStrategy: {
        type: "string",
        description: "Brief description of the transformation approach"
      },
      reasoning: {
        type: "string",
        description: "Why this strategy works for TikTok"
      },
      visualInventory: {
        type: "object",
        description: "What you literally SEE in the image (trust eyes over node names)",
        required: ["logos", "prices", "headlines", "primarySubject", "ctas"],
        additionalProperties: false,
        properties: {
          logos: {
            type: "array",
            description: "Every logo/brand mark visible in the image",
            items: {
              type: "object",
              required: ["description", "nodeNameGuess", "visualLocation"],
              additionalProperties: false,
              properties: {
                description: { type: "string" },
                nodeNameGuess: { type: "string" },
                visualLocation: { type: "string" }
              }
            }
          },
          prices: {
            type: "array",
            description: "Every price/value visible ($XX, 50% off, etc.)",
            items: {
              type: "object",
              required: ["value", "nodeNameGuess"],
              additionalProperties: false,
              properties: {
                value: { type: "string" },
                nodeNameGuess: { type: "string" }
              }
            }
          },
          headlines: {
            type: "array",
            description: "Main text messages visible",
            items: {
              type: "object",
              required: ["text", "nodeNameGuess"],
              additionalProperties: false,
              properties: {
                text: { type: "string" },
                nodeNameGuess: { type: "string" }
              }
            }
          },
          primarySubject: {
            type: "string",
            description: "The hero visual (product, person, mockup)"
          },
          ctas: {
            type: "array",
            description: "Buttons/action text visible",
            items: {
              type: "object",
              required: ["text", "nodeNameGuess"],
              additionalProperties: false,
              properties: {
                text: { type: "string" },
                nodeNameGuess: { type: "string" }
              }
            }
          }
        }
      },
      neverHide: {
        type: "array",
        description: "Node names/IDs of sacred elements that must NEVER be hidden",
        items: { type: "string" }
      },
      designAnalysis: {
        type: "object",
        description: "Deep understanding of the source design",
        required: [
          "visualFocal",
          "compositionalFlow",
          "layoutLogic",
          "typographyHierarchy",
          "designIntent",
          "criticalRelationships"
        ],
        additionalProperties: false,
        properties: {
          visualFocal: {
            type: "string",
            description: "Primary focal point description"
          },
          compositionalFlow: {
            type: "string",
            description: "How eye moves through design"
          },
          layoutLogic: {
            type: "string",
            description: "Grid, stack, hierarchy explanation"
          },
          typographyHierarchy: {
            type: "string",
            description: "Type system analysis"
          },
          designIntent: {
            type: "string",
            description: "Message/purpose of the design"
          },
          criticalRelationships: {
            type: "array",
            description: "Must-preserve dependencies",
            items: { type: "string" }
          }
        }
      },
      elements: {
        type: "object",
        description: "Element categorization for transformation",
        required: ["keep", "hide", "emphasize"],
        additionalProperties: false,
        properties: {
          keep: {
            type: "array",
            description: "Node names to keep visible",
            items: { type: "string" }
          },
          hide: {
            type: "array",
            description: "Node names to hide (ONLY decorative elements)",
            items: { type: "string" }
          },
          emphasize: {
            type: "array",
            description: "Node names to scale up/position prominently",
            items: { type: "string" }
          }
        }
      },
      layoutZones: {
        type: "object",
        description: "Semantic layout zones (percentages 0-100)",
        required: ["hero", "content", "branding", "safeArea"],
        additionalProperties: false,
        properties: {
          hero: {
            type: "object",
            required: ["top", "bottom"],
            additionalProperties: false,
            properties: {
              top: { type: "number" },
              bottom: { type: "number" }
            }
          },
          content: {
            type: "object",
            required: ["top", "bottom"],
            additionalProperties: false,
            properties: {
              top: { type: "number" },
              bottom: { type: "number" }
            }
          },
          branding: {
            type: "object",
            required: ["top", "bottom"],
            additionalProperties: false,
            properties: {
              top: { type: "number" },
              bottom: { type: "number" }
            }
          },
          safeArea: {
            type: "object",
            required: ["top", "bottom"],
            additionalProperties: false,
            properties: {
              top: { type: "number" },
              bottom: { type: "number" }
            }
          }
        }
      },
      focalPoints: {
        type: "array",
        description: "Detected faces or subjects that need protection",
        items: {
          type: "object",
          required: ["nodeId", "nodeName", "position", "importance"],
          additionalProperties: false,
          properties: {
            nodeId: { type: "string" },
            nodeName: { type: "string" },
            position: {
              type: "object",
              required: ["x", "y"],
              additionalProperties: false,
              properties: {
                x: { type: "number", description: "0-1 normalized" },
                y: { type: "number", description: "0-1 normalized" }
              }
            },
            importance: {
              type: "string",
              enum: ["critical", "high", "medium", "low"]
            }
          }
        }
      }
    }
  }
} as const;

// ============================================================================
// Stage 2: Design Specs Schema
// ============================================================================

/**
 * JSON Schema for Stage 2: Detailed Node Specifications
 *
 * AI outputs node-by-node positioning for the TikTok variant.
 */
export const STAGE_2_SCHEMA = {
  name: "stage2_design_specs",
  strict: true,
  schema: {
    type: "object",
    required: ["plan", "nodes", "confidence", "warnings"],
    additionalProperties: false,
    properties: {
      plan: {
        description: "The design plan from Stage 1 (echo back)",
        ...STAGE_1_SCHEMA.schema
      },
      nodes: {
        type: "array",
        description: "Node-by-node positioning specifications",
        items: {
          type: "object",
          // OpenAI strict mode: ALL properties must be in required array
          required: [
            "nodeId",
            "nodeName",
            "visible",
            "position",
            "size",
            "zIndex",
            "textTruncate",
            "maxLines",
            "scaleFactor",
            "rationale"
          ],
          additionalProperties: false,
          properties: {
            nodeId: {
              type: "string",
              description: "Figma node ID"
            },
            nodeName: {
              type: "string",
              description: "Human-readable name"
            },
            visible: {
              type: "boolean",
              description: "Whether node should be visible"
            },
            // Nullable object pattern for OpenAI strict mode
            position: {
              anyOf: [
                {
                  type: "object",
                  required: ["x", "y"],
                  additionalProperties: false,
                  properties: {
                    x: { type: "number", description: "Pixels from left edge" },
                    y: { type: "number", description: "Pixels from top edge" }
                  }
                },
                { type: "null" }
              ],
              description: "Position in target frame (null for auto-layout children)"
            },
            size: {
              anyOf: [
                {
                  type: "object",
                  required: ["width", "height"],
                  additionalProperties: false,
                  properties: {
                    width: { type: "number" },
                    height: { type: "number" }
                  }
                },
                { type: "null" }
              ],
              description: "Size override (null if not resizing)"
            },
            zIndex: {
              type: ["number", "null"],
              description: "Stack order (higher = in front)"
            },
            textTruncate: {
              type: ["boolean", "null"],
              description: "For text nodes: truncate content"
            },
            maxLines: {
              type: ["number", "null"],
              description: "For text nodes: maximum lines"
            },
            scaleFactor: {
              type: ["number", "null"],
              description: "1.0 = normal, >1 = larger"
            },
            rationale: {
              type: ["string", "null"],
              description: "Brief explanation"
            }
          }
        }
      },
      confidence: {
        type: "number",
        description: "Overall confidence 0-1"
      },
      warnings: {
        type: "array",
        description: "Any concerns about the design",
        items: { type: "string" }
      }
    }
  }
} as const;

// ============================================================================
// Stage 3: Evaluation Schema
// ============================================================================

/**
 * JSON Schema for Stage 3: Design Evaluation
 *
 * AI evaluates the generated variant for issues.
 */
export const STAGE_3_SCHEMA = {
  name: "stage3_evaluation",
  strict: true,
  schema: {
    type: "object",
    required: ["passed", "issues", "adjustments", "confidence"],
    additionalProperties: false,
    properties: {
      passed: {
        type: "boolean",
        description: "Whether design passes quality checks"
      },
      issues: {
        type: "array",
        description: "Issues detected that need correction",
        items: {
          type: "object",
          required: ["type", "description", "affectedNodes", "suggestedFix"],
          additionalProperties: false,
          properties: {
            type: {
              type: "string",
              enum: ["overlap", "overflow", "visibility", "safe-area", "composition"]
            },
            description: { type: "string" },
            affectedNodes: {
              type: "array",
              items: { type: "string" }
            },
            suggestedFix: { type: "string" }
          }
        }
      },
      adjustments: {
        type: "array",
        description: "NodeSpec corrections to apply",
        items: {
          type: "object",
          // OpenAI strict mode: ALL properties must be in required array
          required: ["nodeId", "nodeName", "visible", "position", "size"],
          additionalProperties: false,
          properties: {
            nodeId: { type: "string" },
            nodeName: { type: "string" },
            visible: { type: "boolean" },
            position: {
              anyOf: [
                {
                  type: "object",
                  required: ["x", "y"],
                  additionalProperties: false,
                  properties: {
                    x: { type: "number" },
                    y: { type: "number" }
                  }
                },
                { type: "null" }
              ]
            },
            size: {
              anyOf: [
                {
                  type: "object",
                  required: ["width", "height"],
                  additionalProperties: false,
                  properties: {
                    width: { type: "number" },
                    height: { type: "number" }
                  }
                },
                { type: "null" }
              ]
            }
          }
        }
      },
      confidence: {
        type: "number",
        description: "Confidence in evaluation 0-1"
      }
    }
  }
} as const;

// ============================================================================
// Type Exports for TypeScript Integration
// ============================================================================

export type Stage1Schema = typeof STAGE_1_SCHEMA;
export type Stage2Schema = typeof STAGE_2_SCHEMA;
export type Stage3Schema = typeof STAGE_3_SCHEMA;
