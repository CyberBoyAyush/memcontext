import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { chunkTranscript, isHandoffContent, renderContext, estimateTokens } from "./memory-context.js";
import type { TranscriptMessage } from "@memcontext/types";

const msg = (role: TranscriptMessage["role"], content: string): TranscriptMessage => ({ role, content });

describe("isHandoffContent", () => {
  it("matches in-progress style prefixes", () => {
    for (const s of ["In progress: pagination", "in-progress - x", "WIP: y", "Handoff — z", "  in progress:next"]) {
      assert.equal(isHandoffContent(s), true, s);
    }
  });
  it("ignores normal content", () => {
    for (const s of ["User prefers pnpm", "Progress on pagination is good", "The WIP branch is merged"]) {
      assert.equal(isHandoffContent(s), false, s);
    }
  });
});

describe("chunkTranscript", () => {
  const long = (n: number) => "x".repeat(n);
  it("drops system/tool messages and redacts secrets", () => {
    const r = chunkTranscript(
      [msg("system", "sys"), msg("user", `key ${["sk", "live", "51QxAarav9Hd7Lm2Pq8Rt4Vw6Yz0Bc3Ef5Gh"].join("_")}`), msg("tool", "out"), msg("assistant", "ok")],
      { final: true },
    );
    assert.equal(r.chunks.length, 1);
    assert.ok(!r.chunks[0].includes("sk_live"));
    assert.ok(!r.chunks[0].includes("sys"));
    assert.equal(r.redacted, 1);
    assert.match(r.chunks[0], /^USER: key \[REDACTED_SECRET\]\n\nASSISTANT: ok$/);
  });

  it("keeps leading chunk boundaries stable as the transcript grows", () => {
    const base = [msg("user", long(3000)), msg("assistant", long(3000)), msg("user", long(3000))];
    const a = chunkTranscript(base, { final: true });
    const b = chunkTranscript([...base, msg("assistant", long(3000)), msg("user", long(10))], { final: true });
    assert.equal(a.chunks[0], b.chunks[0]);
  });

  it("redacts a <private> span that crosses the per-line split", () => {
    const content = `${"a".repeat(7990)} <private>${"secret plan ".repeat(5)}</private> after`;
    const r = chunkTranscript([msg("user", content)], { final: true });
    const all = r.chunks.join("\n");
    assert.ok(!all.includes("secret plan"), "private text leaked");
    assert.ok(all.includes("after"), "text after the span was dropped");
  });

  it("splits long messages instead of truncating them", () => {
    const r = chunkTranscript([msg("user", `${"y".repeat(20_000)}END`)], { final: true });
    assert.ok(r.chunks.join("").includes("END"));
  });

  it("marks the date when a conversation moves to a new day", () => {
    const r = chunkTranscript(
      [
        { role: "user", content: "a", at: "2026-10-01T10:00:00Z" },
        { role: "assistant", content: "b", at: "2026-10-01T10:01:00Z" },
        { role: "user", content: "c", at: "2026-10-03T09:00:00Z" },
      ],
      { final: true },
    );
    assert.equal(r.chunks[0], "[2026-10-01] USER: a\n\nASSISTANT: b\n\n[2026-10-03] USER: c");
  });

  it("starts every chunk with its own date", () => {
    const r = chunkTranscript(
      [
        { role: "user", content: long(4000), at: "2026-10-01T10:00:00Z" },
        { role: "user", content: long(4000), at: "2026-12-05T10:00:00Z" },
        { role: "assistant", content: long(4000) },
      ],
      { final: true },
    );
    assert.deepEqual(r.days, ["2026-10-01", "2026-12-05", "2026-12-05"]);
    assert.ok(r.chunks[2].startsWith("[2026-12-05] ASSISTANT:"), r.chunks[2].slice(0, 30));
  });

  it("holds back the trailing partial chunk when final=false", () => {
    const r = chunkTranscript([msg("user", long(3000)), msg("assistant", long(3000)), msg("user", "short")], { final: false });
    assert.equal(r.heldBack, true);
    assert.equal(r.chunks.length, 1);
    const f = chunkTranscript([msg("user", "only short")], { final: false });
    assert.equal(f.chunks.length, 0);
    assert.equal(f.heldBack, true);
  });
});

describe("renderContext", () => {
  const d = new Date("2026-10-21T10:00:00Z");
  it("renders dates, client and history, and respects the budget", () => {
    const lines = Array.from({ length: 40 }, (_, i) => ({ content: `fact number ${i} with some words`, createdAt: d }));
    const r = renderContext(
      [
        { title: "In progress", lines: [{ content: "In progress: pagination, next add nextCursor", createdAt: d, client: "codex" }] },
        { title: "Relevant", lines: [{ content: "Wedding on Dec 8", createdAt: d, client: "chatgpt", previous: [{ content: "Wedding on Dec 6", createdAt: new Date("2026-10-07") }] }, ...lines] },
      ],
      200,
    );
    assert.ok(r.tokens <= 200 + 10, `tokens ${r.tokens}`);
    assert.match(r.text, /## In progress\n- In progress: pagination, next add nextCursor \(2026-10-21, via codex\)/);
    assert.match(r.text, /Wedding on Dec 8 \(2026-10-21, via chatgpt\) · before: Wedding on Dec 6 \(2026-10-07\)/);
    assert.ok(r.included < 42);
    assert.equal(estimateTokens("abcd"), 1);
  });

  it("says when there is nothing yet", () => {
    assert.match(renderContext([], 300).text, /no relevant memory yet/);
  });
});
