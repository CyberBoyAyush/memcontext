import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectExportFormat, parseChatGPTExport, parseClaudeExport } from "./import-parsers.js";

const chatgpt = [
  {
    id: "c1",
    conversation_id: "c1",
    title: "Wedding plans",
    create_time: 1790000000,
    update_time: 1790003600,
    current_node: "n4",
    mapping: {
      root: { id: "root", message: null, parent: null, children: ["n1"] },
      n1: { message: { author: { role: "system" }, content: { content_type: "text", parts: ["sys"] } }, parent: "root", children: ["n2"] },
      n2: { message: { author: { role: "user" }, content: { content_type: "text", parts: ["Wedding moved to Dec 19"] }, create_time: 1790000100 }, parent: "n1", children: ["n3", "n3b"] },
      n3b: { message: { author: { role: "assistant" }, content: { content_type: "text", parts: ["abandoned branch"] } }, parent: "n2", children: [] },
      n3: { message: { author: { role: "assistant" }, content: { content_type: "text", parts: ["Noted: Dec 19."] } }, parent: "n2", children: ["n4"] },
      n4: { message: { author: { role: "user" }, content: { content_type: "text", parts: ["Budget is ₹15,000"] } }, parent: "n3", children: [] },
    },
  },
  { id: "empty", mapping: { a: { message: null, parent: null, children: [] } } },
];

const claude = [
  {
    uuid: "k1",
    name: "Oven",
    created_at: "2026-10-01T10:00:00Z",
    updated_at: "2026-10-02T10:00:00Z",
    chat_messages: [
      { sender: "human", text: "Should I buy the deck oven?", created_at: "2026-10-01T10:00:00Z" },
      { sender: "assistant", text: "", content: [{ type: "text", text: "Compare the 2-deck and 1-deck." }] },
      { sender: "human", text: "   " },
    ],
  },
];

describe("import parsers", () => {
  it("detects formats", () => {
    assert.equal(detectExportFormat(chatgpt), "chatgpt");
    assert.equal(detectExportFormat(claude), "claude");
    assert.equal(detectExportFormat([{ foo: 1 }]), null);
    assert.equal(detectExportFormat([]), null);
  });

  it("parses the visible ChatGPT branch in order, skipping system and empty conversations", () => {
    const parsed = parseChatGPTExport(chatgpt);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].id, "c1");
    assert.deepEqual(
      parsed[0].messages.map((m) => [m.role, m.content]),
      [
        ["user", "Wedding moved to Dec 19"],
        ["assistant", "Noted: Dec 19."],
        ["user", "Budget is ₹15,000"],
      ],
    );
    assert.equal(parsed[0].date, new Date(1790003600 * 1000).toISOString());
  });

  it("parses Claude exports with text in content blocks", () => {
    const parsed = parseClaudeExport(claude);
    assert.equal(parsed.length, 1);
    assert.deepEqual(
      parsed[0].messages.map((m) => [m.role, m.content]),
      [
        ["user", "Should I buy the deck oven?"],
        ["assistant", "Compare the 2-deck and 1-deck."],
      ],
    );
    assert.equal(parsed[0].date, "2026-10-02T10:00:00.000Z");
  });
});
