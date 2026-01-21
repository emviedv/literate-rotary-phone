/**
 * Chat message interface compatible with OpenAI chat completion format.
 * Used for few-shot example training pairs.
 */
export interface ChatMessage {
  readonly role: "system" | "user" | "assistant";
  readonly name?: string;
  readonly content: string;
}