// 依存ゼロの軽量テスト。`node scripts/score.test.mjs` で実行できる。
import assert from 'node:assert/strict';
import {
  scoreIdea,
  scoreIdeas,
  BASE_POINTS,
  STATUS_POINTS,
  REACTION_POINTS,
} from './score.mjs';

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

test('基本ポイントだけが付く（ラベル・リアクションなし）', () => {
  const idea = scoreIdea({
    number: 1,
    title: '休憩室にコーヒーメーカーを',
    user: { login: 'shinji' },
    labels: [],
  });
  assert.equal(idea.points, BASE_POINTS);
  assert.equal(idea.status, '受付');
  assert.equal(idea.category, '未分類');
});

test('ステータスは最も進んだ状態のみ加点する', () => {
  const idea = scoreIdea({
    number: 2,
    title: 'テスト',
    user: { login: 'a' },
    labels: ['status:検討中', 'status:採用'],
  });
  assert.equal(idea.points, BASE_POINTS + STATUS_POINTS['status:採用']);
  assert.equal(idea.status, '採用');
});

test('リアクションが加点され、カテゴリを抽出する', () => {
  const idea = scoreIdea({
    number: 3,
    title: '[アイデア] シフト自動化',
    user: { login: 'b' },
    labels: ['cat:業務改善', 'status:実装済み'],
    positiveReactions: 4,
  });
  const expected =
    BASE_POINTS + STATUS_POINTS['status:実装済み'] + 4 * REACTION_POINTS;
  assert.equal(idea.points, expected);
  assert.equal(idea.category, '業務改善');
  assert.equal(idea.title, 'シフト自動化'); // 接頭辞 [アイデア] を除去
});

test('集計：ランキング・サマリが正しい', () => {
  const { ideas, leaderboard, summary } = scoreIdeas([
    { number: 1, title: 'A', user: { login: 'shinji' }, labels: ['status:採用'], positiveReactions: 2 },
    { number: 2, title: 'B', user: { login: 'mori' }, labels: [] },
    { number: 3, title: 'C', user: { login: 'shinji' }, labels: [] },
  ]);

  assert.equal(ideas.length, 3);
  // shinji: (10+80+6) + (10) = 106 / mori: 10
  assert.equal(leaderboard[0].user, 'shinji');
  assert.equal(leaderboard[0].points, BASE_POINTS + 80 + 6 + BASE_POINTS);
  assert.equal(leaderboard[0].rank, 1);
  assert.equal(leaderboard[0].adopted, 1);
  assert.equal(summary.totalIdeas, 3);
  assert.equal(summary.totalContributors, 2);
  assert.equal(summary.adoptedIdeas, 1);
});

test('空入力でも壊れない', () => {
  const { ideas, leaderboard, summary } = scoreIdeas([]);
  assert.deepEqual(ideas, []);
  assert.deepEqual(leaderboard, []);
  assert.equal(summary.totalPoints, 0);
});

console.log(`\n${passed} 件のテストに合格しました ✨`);
