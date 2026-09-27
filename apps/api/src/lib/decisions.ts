import { logger } from "./logger.js";

/**
 * Centralized client for typed decision models (TypeSafe Jev) via
 * OpenRouter's Decisions API. Every caller passes a `state` plus named
 * typed questions and gets typed answers back, so the model or provider
 * can be swapped here without touching call sites.
 */
const DECISIONS_URL = "https://openrouter.ai/api/alpha/decisions";
export const DEFAULT_DECISION_MODEL = "typesafe/jev-1.13";
const DEFAULT_TIMEOUT_MS = 10_000;

export interface NoulQuestion {
  type: "noul";
  instructions: string;
  criteria?: { true?: string; false?: string };
}

export interface ChoiceQuestion {
  type: "choice";
  instructions: string;
  criteria: Record<string, string | null>;
}

export interface ScoreQuestion {
  type: "score";
  instructions: string;
  criteria: string[];
}

export type DecisionQuestion = NoulQuestion | ChoiceQuestion | ScoreQuestion;

export interface NoulAnswer {
  type: "noul";
  noul: number;
}

export interface ChoiceAnswer {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface ScoreAnswer {
  type: "score";
  score: number;
  confidence: number;
  probabilities: Record<string, number>;
  legend: Record<string, string>;
}

type AnswerFor<Q extends DecisionQuestion> = Q extends NoulQuestion
  ? NoulAnswer
  : Q extends ChoiceQuestion
    ? ChoiceAnswer
    : ScoreAnswer;

export type DecisionAnswers<T extends Record<string, DecisionQuestion>> = {
  [K in keyof T]: AnswerFor<T[K]>;
};

export interface DecisionResult<T extends Record<string, DecisionQuestion>> {
  answers: DecisionAnswers<T>;
  model: string;
  usage?: { input_tokens?: number; output_tokens?: number; cost?: number };
}

export interface DecisionOptions {
  model?: string;
  timeoutMs?: number;
  /** Short label used in logs, e.g. "classify_relationship". */
  operation?: string;
}

function isProbability(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

/** Rejects malformed answers so callers' error fallbacks run instead. */
export function isValidAnswer(question: DecisionQuestion, answer: unknown): boolean {
  if (!answer || typeof answer !== "object") return false;
  const a = answer as Record<string, unknown>;
  if (a.type !== question.type) return false;

  switch (question.type) {
    case "noul":
      return isProbability(a.noul);
    case "choice":
      return (
        typeof a.choice === "string" &&
        Object.hasOwn(question.criteria, a.choice) &&
        isProbability(a.confidence)
      );
    case "score":
      return (
        typeof a.score === "number" &&
        Number.isFinite(a.score) &&
        a.score >= 0 &&
        a.score <= question.criteria.length - 1 &&
        isProbability(a.confidence)
      );
  }
}

function getApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is required");
  }
  return apiKey;
}

export async function decide<T extends Record<string, DecisionQuestion>>(
  state: unknown,
  questions: T,
  options: DecisionOptions = {},
): Promise<DecisionResult<T>> {
  const model = options.model ?? DEFAULT_DECISION_MODEL;
  const operation = options.operation ?? "decision";
  const start = performance.now();

  try {
    const response = await fetch(DECISIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://memcontext.in",
        "X-Title": "MemContext",
      },
      body: JSON.stringify({ model, state, questions }),
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `Decision request failed (${response.status})${text ? `: ${text}` : ""}`,
      );
    }

    const json = (await response.json()) as {
      model?: string;
      answers?: Record<string, unknown>;
      usage?: DecisionResult<T>["usage"];
    };

    // Validate every requested answer so callers can rely on the typed shape.
    for (const [key, question] of Object.entries(questions)) {
      if (!isValidAnswer(question, json.answers?.[key])) {
        throw new Error(`Decision response missing valid answer for "${key}"`);
      }
    }

    logger.debug(
      {
        model: json.model ?? model,
        operation,
        questionCount: Object.keys(questions).length,
        duration: Math.round(performance.now() - start),
        cost: json.usage?.cost,
      },
      "decision completed",
    );

    return {
      answers: json.answers as DecisionAnswers<T>,
      model: json.model ?? model,
      usage: json.usage,
    };
  } catch (error) {
    logger.error(
      {
        model,
        operation,
        duration: Math.round(performance.now() - start),
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      "decision request failed",
    );
    throw error;
  }
}
