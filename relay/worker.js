// アイデアBANK 投稿リレー (Cloudflare Worker)
//
// 独自HTMLの投稿フォームから POST を受け取り、GitHub の repository_dispatch を
// 叩いて Issue 作成ワークフロー(idea-endpoint.yml)を起動する。
// GitHub トークンは Worker のシークレットに保持し、ブラウザには一切出さない。
//
// 必要なシークレット / 変数 (wrangler secret put で設定):
//   GH_TOKEN     … repository_dispatch 権限を持つ fine-grained PAT
//                  (対象リポジトリ / Contents: Read and write)
//   REPO         … "NS-user/NS-idea-BANK"
//   ACCESS_CODE  … （任意）組合コード。設定すると一致必須になる
//   ALLOW_ORIGIN … （任意）許可するオリジン。既定は "*"

const json = (obj, status, origin) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });

export default {
  async fetch(request, env) {
    const origin = env.ALLOW_ORIGIN || '*';
    if (request.method === 'OPTIONS') return json({}, 204, origin);
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, origin);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'invalid json' }, 400, origin);
    }

    // ハニーポット: bot が website を埋めたら成功を装って無視
    if (body.website) return json({ ok: true }, 200, origin);

    // 組合コード
    if (env.ACCESS_CODE && String(body.code || '') !== String(env.ACCESS_CODE)) {
      return json({ error: 'invalid code' }, 403, origin);
    }

    const title = String(body.title || '').trim();
    if (!title) return json({ error: 'title required' }, 400, origin);

    const clip = (s, n) => String(s || '').slice(0, n);
    const payload = {
      title: clip(title, 120),
      category: clip(body.category || 'その他', 20),
      detail: clip(body.detail, 2000),
      proposal: clip(body.proposal, 2000),
      effect: clip(body.effect, 1000),
      author: clip(body.author || '匿名', 40),
    };

    const gh = await fetch(`https://api.github.com/repos/${env.REPO}/dispatches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GH_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'idea-bank-relay',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event_type: 'idea-submit', client_payload: payload }),
    });

    if (gh.status !== 204) {
      const text = await gh.text();
      return json({ error: 'github dispatch failed', status: gh.status, detail: text.slice(0, 300) }, 502, origin);
    }
    return json({ ok: true }, 200, origin);
  },
};
