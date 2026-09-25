// snapshot.js：快照一致性
// 同一快照内多次求值结果必须一致；跨快照比较列出取值变化的用户。
import { bucketOf, __internals } from "./rollout.js";

const NO_SNAPSHOT_CODE = "E_NO_SNAPSHOT";

function noSnapshotError(flagId, version) {
  const error = new Error(NO_SNAPSHOT_CODE + ": flag " + flagId + " needs snapshot version " + version);
  error.code = NO_SNAPSHOT_CODE;
  return error;
}

// 在指定快照下对全部开关做一次线性求值，返回 { userId: { flagId: boolean } }。
function evaluateAt(flags, users, snapshot, bucketCount, salt) {
  const values = {};
  for (const user of users) {
    const perFlag = {};
    for (const flag of flags) {
      const percent = snapshot.percent && flag.id in snapshot.percent
        ? snapshot.percent[flag.id]
        : flag.percent;
      const bucket = bucketOf(salt, user.id, flag.id, bucketCount);
      perFlag[flag.id] = __internals.isOn(bucket, percent, bucketCount);
    }
    values[user.id] = perFlag;
  }
  return values;
}

export function consistent(flags, users, snapshots, bucketCount, salt) {
  const useSalt = salt == null ? __internals.DEFAULT_SALT : salt;
  if (!snapshots || snapshots.length === 0) {
    return { stable: true, changed: [], version: 0 };
  }

  const versions = snapshots.map((snapshot) => snapshot.version);
  for (const flag of flags) {
    if (flag.version != null && !versions.includes(flag.version)) {
      throw noSnapshotError(flag.id, flag.version);
    }
  }
  const version = Math.max.apply(null, versions);

  const sorted = snapshots.slice().sort((a, b) => a.version - b.version);

  // 稳定性：对同一快照（最新版本）重复求值，结果必须逐字节一致。
  const latest = sorted[sorted.length - 1];
  const firstRun = JSON.stringify(evaluateAt(flags, users, latest, bucketCount, useSalt));
  let stable = true;
  for (let run = 0; run < 2; run++) {
    if (JSON.stringify(evaluateAt(flags, users, latest, bucketCount, useSalt)) !== firstRun) {
      stable = false;
      break;
    }
  }

  // 跨快照：按版本顺序两两比较，任一开关取值变化即记该用户。
  const changedSet = new Set();
  let previous = evaluateAt(flags, users, sorted[0], bucketCount, useSalt);
  for (let i = 1; i < sorted.length; i++) {
    const current = evaluateAt(flags, users, sorted[i], bucketCount, useSalt);
    for (const user of users) {
      for (const flag of flags) {
        if (previous[user.id][flag.id] !== current[user.id][flag.id]) {
          changedSet.add(user.id);
        }
      }
    }
    previous = current;
  }
  const changed = users.map((user) => user.id).filter((id) => changedSet.has(id));

  return { stable: stable, changed: changed, version: version };
}
