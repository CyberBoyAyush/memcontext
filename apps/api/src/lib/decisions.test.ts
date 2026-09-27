import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidAnswer, type DecisionQuestion } from "./decisions.js";

const noul: DecisionQuestion = { type: "noul", instructions: "q" };
const choice: DecisionQuestion = {
  type: "choice",
  instructions: "q",
  criteria: { a: "A", b: "B" },
};
const score: DecisionQuestion = {
  type: "score",
  instructions: "q",
  criteria: ["0", "1", "2", "3"],
};

test("accepts well-formed answers", () => {
  assert.ok(isValidAnswer(noul, { type: "noul", noul: 0.7 }));
  assert.ok(isValidAnswer(choice, { type: "choice", choice: "a", confidence: 0.9 }));
  assert.ok(isValidAnswer(score, { type: "score", score: 2.4, confidence: 0.8 }));
});

test("rejects missing or mistyped answers", () => {
  assert.equal(isValidAnswer(noul, undefined), false);
  assert.equal(isValidAnswer(noul, { type: "choice", choice: "a" }), false);
  assert.equal(isValidAnswer(noul, { type: "noul" }), false);
});

test("rejects out-of-range or unknown values", () => {
  assert.equal(isValidAnswer(noul, { type: "noul", noul: 1.5 }), false);
  assert.equal(isValidAnswer(choice, { type: "choice", choice: "c", confidence: 0.9 }), false);
  assert.equal(isValidAnswer(choice, { type: "choice", choice: "a", confidence: Number.NaN }), false);
  assert.equal(isValidAnswer(score, { type: "score", score: 4, confidence: 0.8 }), false);
  assert.equal(isValidAnswer(score, { type: "score", score: -1, confidence: 0.8 }), false);
});
