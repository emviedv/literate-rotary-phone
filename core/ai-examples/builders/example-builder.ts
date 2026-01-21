/**
 * Implementation of example builder utilities for creating type-safe training examples.
 * These builders enable fluent construction of AI few-shot training pairs.
 */

import type {
  ExampleBuilder,
  TrainingPair,
  ExampleMetadata,
  AIAnalysisResponse
} from '../types/example-builder.js';
import type { ChatMessage } from '../types/chat-message.js';
import type { FrameAnalysisInput } from '../types/frame-analysis.js';
import { validateChatMessage, validateFrameInput, validateAIResponse } from './validation.js';

/**
 * Implementation of the example builder pattern
 */
export class ExampleBuilderImpl implements ExampleBuilder {
  private metadata?: ExampleMetadata;
  private frameInput?: FrameAnalysisInput;
  private aiResponse?: AIAnalysisResponse;

  constructor() {
    // Initialize empty builder
  }

  public withMetadata(metadata: ExampleMetadata): ExampleBuilder {
    this.metadata = metadata;
    return this;
  }

  public withFrameInput(input: FrameAnalysisInput): ExampleBuilder {
    // Validate the frame input
    const validation = validateFrameInput(input);
    if (!validation.isValid) {
      throw new Error(`Invalid frame input: ${validation.errors.join(', ')}`);
    }

    this.frameInput = input;
    return this;
  }

  public withAIResponse(response: AIAnalysisResponse): ExampleBuilder {
    // Validate the AI response
    const validation = validateAIResponse(response);
    if (!validation.isValid) {
      throw new Error(`Invalid AI response: ${validation.errors.join(', ')}`);
    }

    this.aiResponse = response;
    return this;
  }

  public build(): TrainingPair {
    if (!this.metadata) {
      throw new Error('Example metadata is required');
    }
    if (!this.frameInput) {
      throw new Error('Frame input is required');
    }
    if (!this.aiResponse) {
      throw new Error('AI response is required');
    }

    // Create the user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: JSON.stringify(this.frameInput)
    };

    // Create the assistant message
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: JSON.stringify(this.aiResponse)
    };

    // Validate the generated messages
    const userValidation = validateChatMessage(userMessage);
    const assistantValidation = validateChatMessage(assistantMessage);

    if (!userValidation.isValid) {
      throw new Error(`Generated user message invalid: ${userValidation.errors.join(', ')}`);
    }
    if (!assistantValidation.isValid) {
      throw new Error(`Generated assistant message invalid: ${assistantValidation.errors.join(', ')}`);
    }

    return {
      userMessage,
      assistantMessage,
      input: this.frameInput,
      response: this.aiResponse
    };
  }
}

/**
 * Factory function for creating new example builders
 */
export function createExampleBuilder(): ExampleBuilder {
  return new ExampleBuilderImpl();
}

/**
 * Utility class for creating frame analysis inputs
 */
export class FrameInputBuilder {
  private frameId?: string;
  private frameName?: string;
  private frameSize?: { width: number; height: number };
  private nodes?: FrameAnalysisInput['frame']['nodes'];
  private targets?: FrameAnalysisInput['targets'];

  public withFrame(id: string, name: string, size: { width: number; height: number }): FrameInputBuilder {
    this.frameId = id;
    this.frameName = name;
    this.frameSize = size;
    return this;
  }

  public withNodes(nodes: FrameAnalysisInput['frame']['nodes']): FrameInputBuilder {
    this.nodes = nodes;
    return this;
  }

  public withTargets(targets: FrameAnalysisInput['targets']): FrameInputBuilder {
    this.targets = targets;
    return this;
  }

  public build(): FrameAnalysisInput {
    if (!this.frameId || !this.frameName || !this.frameSize) {
      throw new Error('Frame ID, name, and size are required');
    }
    if (!this.nodes || this.nodes.length === 0) {
      throw new Error('At least one frame node is required');
    }
    if (!this.targets || this.targets.length === 0) {
      throw new Error('At least one target format is required');
    }

    return {
      frame: {
        id: this.frameId,
        name: this.frameName,
        size: this.frameSize,
        childCount: this.nodes.length,
        nodes: this.nodes
      },
      targets: this.targets
    };
  }
}

/**
 * Factory function for creating frame input builders
 */
export function createFrameInputBuilder(): FrameInputBuilder {
  return new FrameInputBuilder();
}

/**
 * Utility class for creating AI analysis responses
 */
export class AIResponseBuilder {
  private signals?: AIAnalysisResponse['signals'];
  private layoutAdvice?: AIAnalysisResponse['layoutAdvice'];

  public withSignals(signals: AIAnalysisResponse['signals']): AIResponseBuilder {
    this.signals = signals;
    return this;
  }

  public withLayoutAdvice(advice: AIAnalysisResponse['layoutAdvice']): AIResponseBuilder {
    this.layoutAdvice = advice;
    return this;
  }

  public build(): AIAnalysisResponse {
    if (!this.signals) {
      throw new Error('AI signals are required');
    }
    if (!this.layoutAdvice) {
      throw new Error('Layout advice is required');
    }

    return {
      signals: this.signals,
      layoutAdvice: this.layoutAdvice
    };
  }
}

/**
 * Factory function for creating AI response builders
 */
export function createAIResponseBuilder(): AIResponseBuilder {
  return new AIResponseBuilder();
}

/**
 * High-level utility for creating complete training pairs
 */
export class TrainingPairFactory {
  /**
   * Create a simple training pair with minimal boilerplate
   */
  public static createSimple(
    exampleName: string,
    frameData: Omit<FrameAnalysisInput['frame'], 'childCount'>,
    targets: FrameAnalysisInput['targets'],
    aiResponse: AIAnalysisResponse
  ): TrainingPair {
    const metadata: ExampleMetadata = {
      id: frameData.id,
      name: exampleName,
      category: 'generated',
      difficulty: 'simple',
      targetFormats: targets.map(t => t.id),
      featuredConcepts: []
    };

    const frameInput: FrameAnalysisInput = {
      frame: {
        ...frameData,
        childCount: frameData.nodes.length
      },
      targets
    };

    return createExampleBuilder()
      .withMetadata(metadata)
      .withFrameInput(frameInput)
      .withAIResponse(aiResponse)
      .build();
  }

  /**
   * Extract a training pair from existing ChatMessage array
   */
  public static fromMessages(userMsg: ChatMessage, assistantMsg: ChatMessage): TrainingPair {
    if (userMsg.role !== 'user' || assistantMsg.role !== 'assistant') {
      throw new Error('Invalid message roles');
    }

    let frameInput: FrameAnalysisInput;
    let aiResponse: AIAnalysisResponse;

    try {
      frameInput = JSON.parse(userMsg.content);
      aiResponse = JSON.parse(assistantMsg.content);
    } catch (error) {
      throw new Error(`Failed to parse message content: ${error}`);
    }

    return {
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      input: frameInput,
      response: aiResponse
    };
  }
}