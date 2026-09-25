// snapshot.js：快照一致性（基线：每次重新求值、不认快照）
export function consistent(flags, users, snapshots, bucketCount) {
  return { stable: false, changed: [], version: 0 };
}
