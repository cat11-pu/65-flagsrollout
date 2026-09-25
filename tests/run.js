import assert from "node:assert";
import { evaluate } from "../rollout.js";
import { consistent } from "../snapshot.js";
import { render } from "../app.js";

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

const flags = [{ id: "f0", percent: 50, version: 2 }];
const users = [{ id: "u0" }];

check("evaluate returns values", () => {
  assert.strictEqual(typeof evaluate(flags, users, 10).values, "object");
});

check("evaluate returns buckets", () => {
  assert.ok(Array.isArray(evaluate(flags, users, 10).buckets));
});

check("consistent reports stable flag", () => {
  assert.strictEqual(typeof consistent(flags, users, [], 10).stable, "boolean");
});

check("consistent reports version", () => {
  assert.strictEqual(typeof consistent(flags, users, [], 10).version, "number");
});

check("render exposes changed list", () => {
  assert.ok(Array.isArray(render({ flags: flags, users: users, bucket_count: 10, snapshots: [] }).changed));
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
