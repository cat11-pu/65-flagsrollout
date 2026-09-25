// rollout.js：分桶与求值（基线：全部返回开）
export function evaluate(flags, users, bucketCount) {
  const values = {};
  for (const user of users) values[user.id] = true;
  return { values: values, buckets: users.map((user) => 0) };
}
