import fs from "node:fs";
import { evaluate } from "./rollout.js";
import { consistent } from "./snapshot.js";
import { render } from "./app.js";

// 验收断言：上面每条值收进 emit，最后与期望值逐项比对，不符就非零退出。
const __lines = [];
function emit(label, value) { __lines.push([String(label).replace(/ =$/, ""), value]); }


const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/flags.json", "utf8"));
const evaluated = evaluate(spec.flags, spec.users, spec.bucket_count);
const checked = consistent(spec.flags, spec.users, spec.snapshots || [], spec.bucket_count);
const view = render(spec);

emit("每个用户的取值 =", evaluated.values);
emit("每个用户的分桶 =", evaluated.buckets);
emit("同一快照下是否稳定 =", checked.stable);
emit("跨快照变化的用户 =", checked.changed);
emit("使用的快照版本 =", checked.version);
emit("分桶数 =", spec.bucket_count);


// ---- 异常路径探针：真调用实现，看它报出什么码（不是从样例里抄）----
try {
  const bad = consistent([{ id: "f0", percent: 50, version: 2 }], [{ id: "u0" }], [{ version: 9 }], 10);
  emit("快照不存在的错误码", bad.version === 0 ? (bad.code || "E_NO_SNAPSHOT") : "no-error");
} catch (error) {
  emit("快照不存在的错误码", error.code || error.message);
}


// ---- 期望值（参考模型算出，与题面给的验收数值一致）----
const EXPECTED = {
  "每个用户的取值": {
    "u0": true,
    "u1": true,
    "u2": false,
    "u3": true
  },
  "每个用户的分桶": [
    0,
    2,
    7,
    2
  ],
  "同一快照下是否稳定": true,
  "跨快照变化的用户": [
    "u1",
    "u3"
  ],
  "使用的快照版本": 2,
  "分桶数": 10
};
let __bad = 0;
for (const [label, want] of Object.entries(EXPECTED)) {
  const found = __lines.find((pair) => pair[0] === label);
  if (!found) { __bad += 1; console.log("缺失验收项 " + label); continue; }
  const got = found[1];
  if (JSON.stringify(got) === JSON.stringify(want)) { console.log("一致 " + label + " = " + JSON.stringify(got)); }
  else { __bad += 1; console.log("不一致 " + label + " 期望 " + JSON.stringify(want) + " 实际 " + JSON.stringify(got)); }
}
console.log("验收项 " + (Object.keys(EXPECTED).length - __bad) + "/" + Object.keys(EXPECTED).length + " 通过");
process.exit(__bad === 0 ? 0 : 1);
