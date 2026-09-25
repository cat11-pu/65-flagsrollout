// snapshot.js：快照一致性
// 同一快照内多次求值必须一致；跨快照比较列出取值变化的用户。

import { DEFAULT_SALT, computeBuckets, valuesForBuckets } from "./rollout.js";

function noSnapshot(flag) {
  const error = new Error("E_NO_SNAPSHOT: 找不到开关 " + flag.id + " 版本 " + flag.version + " 对应的快照");
  error.code = "E_NO_SNAPSHOT";
  return error;
}

export function consistent(flags, users, snapshots, bucketCount, salt = DEFAULT_SALT) {
  const list = Array.isArray(snapshots) ? snapshots : [];
  const flagList = Array.isArray(flags) ? flags : [flags];

  if (list.length === 0) return { stable: true, changed: [], version: 0 };

  // 异常路径：开关声明的版本在快照里不存在，报 E_NO_SNAPSHOT。
  const versions = new Set(list.map((snapshot) => snapshot.version));
  for (const flag of flagList) {
    if (flag && flag.version !== undefined && !versions.has(flag.version)) {
      throw noSnapshot(flag);
    }
  }

  const flag = flagList[0];
  // 预算：桶只建一次，整批复用，不随快照重复建桶。
  const buckets = computeBuckets(flag, users, bucketCount, salt);

  const ordered = list.slice().sort((a, b) => a.version - b.version);
  const percents = ordered.map((snapshot) =>
    snapshot.percent && snapshot.percent[flag.id] !== undefined
      ? snapshot.percent[flag.id]
      : flag.percent);
  const perSnapshot = percents.map((percent) =>
    valuesForBuckets(flag, users, buckets, bucketCount, percent));

  // 同一快照内反复求值，结果必须一致。
  let stable = true;
  for (let i = 0; i < perSnapshot.length && stable; i += 1) {
    const again = valuesForBuckets(flag, users, buckets, bucketCount, percents[i]);
    for (const user of users) {
      if (again[user.id] !== perSnapshot[i][user.id]) { stable = false; break; }
    }
  }

  // 跨快照比较：任一快照间取值不同的用户都算发生变化。
  const changed = [];
  for (const user of users) {
    const first = perSnapshot[0][user.id];
    for (const values of perSnapshot) {
      if (values[user.id] !== first) { changed.push(user.id); break; }
    }
  }

  const version = ordered[ordered.length - 1].version;
  return { stable: stable, changed: changed, version: version };
}
