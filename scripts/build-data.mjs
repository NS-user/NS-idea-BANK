// 採点結果を docs/data/*.json として書き出す。
//
// 使い方:
//   node scripts/build-data.mjs <issues.json> [outDir=docs/data]
// <issues.json> は GitHub REST API の issue 配列に
//   positiveReactions（👍❤️🎉🚀 の合計）を付与したもの。
// GitHub Actions からはこのファイルを呼び出して data を生成する。

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scoreIdeas } from './score.mjs';

export function buildData(issues, outDir, generatedAt) {
  const { ideas, leaderboard, summary } = scoreIdeas(issues);
  mkdirSync(outDir, { recursive: true });
  const stamp = generatedAt || null;

  writeFileSync(join(outDir, 'ideas.json'), JSON.stringify({ generatedAt: stamp, ideas }, null, 2));
  writeFileSync(join(outDir, 'points.json'), JSON.stringify({ generatedAt: stamp, leaderboard }, null, 2));
  writeFileSync(join(outDir, 'summary.json'), JSON.stringify({ generatedAt: stamp, ...summary }, null, 2));

  return { ideas, leaderboard, summary };
}

// CLI として実行された場合のみファイル入出力を行う
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const [, , issuesPath, outDir] = process.argv;
  if (!issuesPath) {
    console.error('usage: node scripts/build-data.mjs <issues.json> [outDir]');
    process.exit(1);
  }
  const here = dirname(fileURLToPath(import.meta.url));
  const target = outDir || join(here, '..', 'docs', 'data');
  const issues = JSON.parse(readFileSync(issuesPath, 'utf8'));
  const generatedAt = process.env.GENERATED_AT || new Date().toISOString();
  const { summary } = buildData(issues, target, generatedAt);
  console.log(`data written to ${target}:`, summary);
}
