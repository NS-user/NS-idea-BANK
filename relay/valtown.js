// アイデアBANK 投稿リレー（Val.town / HTTP val 版・ブラウザだけで動く）
//
// Val.town で「HTTP val」を作成し、このコードを貼り付けるだけ。
// 環境変数（Settings → Environment Variables）に以下を登録する:
//   GH_TOKEN     … Contents: Read and write 権限の fine-grained PAT（必須）
//   ACCESS_CODE  … 組合コード（任意。設定すると一致必須）
//   REPO         … 省略可。既定は "NS-user/NS-idea-BANK"

const cors = (origin) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
});

export default async function (req) {
  const origin = Deno.env.get("ALLOW_ORIGIN") || "*";
  const reply = (obj, status) => new Response(JSON.stringify(obj), { status, headers: cors(origin) });

  if (req.method === "OPTIONS") return reply({}, 204);
  if (req.method !== "POST") return reply({ error: "method not allowed" }, 405);

  let body;
  try { body = await req.json(); } catch { return reply({ error: "invalid json" }, 400); }

  if (body.website) return reply({ ok: true }, 200); // ハニーポット

  const code = Deno.env.get("ACCESS_CODE");
  if (code && String(body.code || "") !== String(code)) return reply({ error: "invalid code" }, 403);

  const title = String(body.title || "").trim();
  if (!title) return reply({ error: "title required" }, 400);

  const clip = (s, n) => String(s || "").slice(0, n);
  const payload = {
    title: clip(title, 120),
    category: clip(body.category || "その他", 20),
    detail: clip(body.detail, 2000),
    proposal: clip(body.proposal, 2000),
    effect: clip(body.effect, 1000),
    author: clip(body.author || "匿名", 40),
  };

  const REPO = Deno.env.get("REPO") || "NS-user/NS-idea-BANK";
  const gh = await fetch(`https://api.github.com/repos/${REPO}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("GH_TOKEN")}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "idea-bank-relay",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ event_type: "idea-submit", client_payload: payload }),
  });

  if (gh.status !== 204) {
    const text = await gh.text();
    return reply({ error: "github dispatch failed", status: gh.status, detail: text.slice(0, 300) }, 502);
  }
  return reply({ ok: true }, 200);
}
