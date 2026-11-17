import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { redactSecrets, isOnlySecret, REDACTED } from "./redact.js";

// Fake credentials are assembled at runtime so token-shaped literals never sit in source
// (GitHub push protection flags them even when they are test fixtures).
const fake = (...parts: string[]) => parts.join("");

describe("redactSecrets", () => {
  const secrets = [
    fake("sk_", "live_", "51QxAarav9Hd7Lm2Pq8Rt4Vw6Yz0Bc3Ef5Gh"),
    fake("sk-", "proj-", "AbCdEf1234567890abcdefGHIJKL"),
    "sk-or-v1-0123456789abcdef0123456789abcdef",
    fake("gh", "p_", "1234567890abcdefghijABCDEFGHIJ123456"),
    fake("github_", "pat_", "11ABCDEFG0123456789_abcdefghijklmnop"),
    fake("xox", "b-", "1234567890-abcdefghij"),
    fake("AKIA", "IOSFODNN7EXAMPLE"),
    fake("eyJ", "hbGciOiJIUzI1NiJ9.", "eyJ", "zdWIiOiIxMjM0NTY3ODkwIn0.", "dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"),
    fake("sb", "p_", "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8"),
    fake("mc", "_", "AbCdEfGhIjKlMnOpQrStUvWxYz012345"),
  ];
  for (const secret of secrets) {
    it(`redacts ${secret.slice(0, 12)}…`, () => {
      const r = redactSecrets(`the key is ${secret} ok`);
      assert.ok(!r.text.includes(secret), r.text);
      assert.ok(r.count >= 1);
    });
  }

  it("redacts connection-string passwords but keeps the host", () => {
    const r = redactSecrets("DATABASE_URL=postgres://admin:hunter2@db.example.com:5432/app");
    assert.equal(r.text, `DATABASE_URL=postgres://admin:${REDACTED}@db.example.com:5432/app`);
  });

  it("redacts Luhn-valid card numbers with spaces or dashes", () => {
    for (const card of ["4532 0151 1283 0366", "4532-0151-1283-0366", "4532015112830366"]) {
      const r = redactSecrets(`my card ${card} exp 08/29`);
      assert.ok(!r.text.includes("0366"), r.text);
    }
  });

  it("redacts labeled passwords, pins and cvv", () => {
    assert.ok(!redactSecrets("my password is Bake#Meera2026").text.includes("Bake#Meera2026"));
    assert.ok(!redactSecrets("pin: 4821").text.includes("4821"));
    assert.ok(!redactSecrets("CVV 417").text.includes("417"));
    assert.ok(!redactSecrets("cvv=417").text.includes("417"));
  });

  it("redacts <private> spans", () => {
    assert.equal(redactSecrets("hi <private>salary 40L</private> bye").text, "hi [PRIVATE] bye");
  });

  const benign = [
    "commit 4c1e9a7b2d3f4e5a6b7c8d9e0f1a2b3c4d5e6f7a",
    "id 550e8400-e29b-41d4-a716-446655440000",
    "run pnpm test -- --run with TEST_DATABASE_URL=postgres://localhost:55434/shopfront_test",
    "import { createInsertSchema } from 'drizzle-zod'",
    "DODO_WEBHOOK_SECRET is read from .env",
    "the password reset flow uses email links",
    "the function getOrCreateDefaultWorkspaceForUserWithBilling is long",
    "timestamp 1794692930811 and order 100000000000000",
    "call me at +91 98765 43210",
    "budget is ₹15,000 for 2026-12-19",
    "use port 55433 and Node 24",
    "call migrateUserSubscriptionsToStripeV2BillingFlow after deploy",
    "Pin 3.11 in pyproject",
    "pwd: /Users/ayush/app",
    "order id 1794692930818 shipped",
    "the pin is green on the map",
  ];
  for (const text of benign) {
    it(`leaves benign text alone: ${text.slice(0, 40)}`, () => {
      const r = redactSecrets(text);
      assert.equal(r.count, 0, r.text);
      assert.equal(r.text, text);
    });
  }
});

describe("isOnlySecret", () => {
  it("detects content that is only a secret", () => {
    assert.equal(isOnlySecret(`my api key is ${REDACTED}`), true);
    assert.equal(isOnlySecret(`my stripe key is ${REDACTED}`), true);
    assert.equal(isOnlySecret(`${REDACTED}`), true);
    assert.equal(isOnlySecret(`Stripe key rotated, new key ${REDACTED} lives in Railway secrets`), false);
    assert.equal(isOnlySecret(`Pay with card ${REDACTED} for the shop supplies order`), false);
    assert.equal(isOnlySecret(`The deploy bot uses GitHub token ${REDACTED} stored in Railway secrets`), false);
  });
});
