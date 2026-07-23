// アイデアBANK - ポイント算定ロジック（純粋関数 / 外部依存なし）
//
// 1件のアイデア（GitHub Issue）に対して労働組合ポイントを算定し、
// 投稿者ごとの合計・ランキングを組み立てる。
// ここは副作用を持たないので、単体テスト（score.test.mjs）で検証できる。

/** 投稿すると必ずもらえる基本ポイント */
export const BASE_POINTS = 10;

/**
 * ステータスラベルごとの加点。
 * 複数付いている場合は「最も進んだ状態」の点数のみを採用する（加算しない）。
 */
export const STATUS_POINTS = {
  'status:検討中': 20, // 執行部が検討を開始
  'status:採用': 80, // 施策として採用が決定
  'status:実装済み': 200, // 実際に職場へ反映された
};

/** 共感リアクション（👍 ❤️ 🎉 🚀）1件あたりの加点 */
export const REACTION_POINTS = 3;

/** ステータスの表示順（進捗の深い順） */
const STATUS_ORDER = ['status:実装済み', 'status:採用', 'status:検討中'];

/** カテゴリラベルの接頭辞 */
const CATEGORY_PREFIX = 'cat:';

/**
 * ラベル名の配列を受け取り、扱いやすい形に正規化する。
 * @param {Array<string|{name:string}>} labels
 * @returns {string[]}
 */
function labelNames(labels = []) {
  return labels
    .map((l) => (typeof l === 'string' ? l : l && l.name))
    .filter((n) => typeof n === 'string');
}

/**
 * 1件のアイデアのポイントと表示用メタデータを算定する。
 * @param {object} issue GitHub Issue 相当のオブジェクト
 * @returns {object} 採点済みアイデア
 */
export function scoreIdea(issue) {
  const names = labelNames(issue.labels);

  // ステータス加点（最も進んだ状態を1つだけ採用）
  let statusPoints = 0;
  let status = '受付';
  for (const key of STATUS_ORDER) {
    if (names.includes(key)) {
      statusPoints = STATUS_POINTS[key];
      status = key.replace('status:', '');
      break;
    }
  }

  // カテゴリ（先頭の cat: ラベル）
  const categoryLabel = names.find((n) => n.startsWith(CATEGORY_PREFIX));
  const category = categoryLabel ? categoryLabel.slice(CATEGORY_PREFIX.length) : '未分類';

  // 共感リアクション数
  const reactions = Math.max(0, Number(issue.positiveReactions || 0));
  const reactionPoints = reactions * REACTION_POINTS;

  const points = BASE_POINTS + statusPoints + reactionPoints;

  return {
    id: issue.number,
    title: (issue.title || '').replace(/^\s*\[?アイデア\]?\s*/, '').trim() || '(無題)',
    author: (issue.user && issue.user.login) || 'unknown',
    avatar: (issue.user && issue.user.avatar_url) || '',
    url: issue.html_url || '',
    category,
    status,
    reactions,
    points,
    breakdown: { base: BASE_POINTS, status: statusPoints, reactions: reactionPoints },
    createdAt: issue.created_at || null,
  };
}

/**
 * 複数のアイデアを採点し、ランキングとサマリまで含めて集計する。
 * @param {object[]} issues
 * @returns {{ideas:object[], leaderboard:object[], summary:object}}
 */
export function scoreIdeas(issues = []) {
  const ideas = issues.map(scoreIdea).sort((a, b) => b.points - a.points || a.id - b.id);

  // 投稿者ごとに集計
  const byUser = new Map();
  for (const idea of ideas) {
    const cur = byUser.get(idea.author) || {
      user: idea.author,
      avatar: idea.avatar,
      points: 0,
      ideas: 0,
      adopted: 0,
    };
    cur.points += idea.points;
    cur.ideas += 1;
    if (idea.status === '採用' || idea.status === '実装済み') cur.adopted += 1;
    if (!cur.avatar && idea.avatar) cur.avatar = idea.avatar;
    byUser.set(idea.author, cur);
  }

  const leaderboard = [...byUser.values()]
    .sort((a, b) => b.points - a.points || b.adopted - a.adopted || a.user.localeCompare(b.user))
    .map((row, i) => ({ rank: i + 1, ...row }));

  const summary = {
    totalIdeas: ideas.length,
    totalContributors: leaderboard.length,
    totalPoints: ideas.reduce((s, x) => s + x.points, 0),
    adoptedIdeas: ideas.filter((x) => x.status === '採用' || x.status === '実装済み').length,
  };

  return { ideas, leaderboard, summary };
}
