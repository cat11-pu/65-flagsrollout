// app.js：渲染结果
import { evaluate } from "./rollout.js";
import { consistent } from "./snapshot.js";

export function render(spec) {
  const evaluated = evaluate(spec.flags, spec.users, spec.bucket_count, spec.salt);
  const checked = consistent(spec.flags, spec.users, spec.snapshots || [], spec.bucket_count, spec.salt);
  return { values: evaluated.values, buckets: evaluated.buckets, stable: checked.stable,
           changed: checked.changed, version: checked.version };
}
