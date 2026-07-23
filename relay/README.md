# 投稿リレー（Cloudflare Worker）

独自HTMLの投稿フォームから GitHub へ安全に橋渡しする、無料の小さな中継です。
GitHub トークンは Worker のシークレットに保管され、ブラウザには一切出ません。

```
[docs/submit.html] --POST JSON--> [この Worker] --repository_dispatch--> [GitHub Actions] → Issue作成 → 採点
```

## デプロイ（約5分）

1. **投稿用トークンを作る**
   GitHub → Settings → Developer settings → **Fine-grained tokens** で発行。
   - Repository access: `NS-user/NS-idea-BANK` のみ
   - Permissions: **Contents → Read and write**（repository_dispatch に必要）

2. **Worker をデプロイ**
   ```bash
   cd relay
   npx wrangler login
   npx wrangler deploy
   npx wrangler secret put GH_TOKEN        # ← 1で作ったトークンを貼る
   npx wrangler secret put ACCESS_CODE     # ← 組合コード（任意）
   ```
   デプロイ後に表示される URL（例 `https://idea-bank-relay.xxxx.workers.dev`）を控える。

3. **フロントに接続**
   `docs/config.js` の `endpoint` にその URL を貼って push。
   ```js
   window.IDEA_BANK = { endpoint: "https://idea-bank-relay.xxxx.workers.dev", ... };
   ```

これで `docs/submit.html` からの投稿が実際に GitHub Issue になり、自動採点されます。

## 動作確認

```bash
curl -X POST "$WORKER_URL" -H "Content-Type: application/json" \
  -d '{"title":"テスト投稿","category":"業務改善","detail":"a","proposal":"b","author":"tester","code":"組合コード"}'
# => {"ok":true}
```

## 他の実行基盤でも可

ロジックは `worker.js` の `fetch(request, env)` に集約しています。
Deno Deploy / Vercel / Netlify Functions などでも、同じ4つの環境変数
（`GH_TOKEN` / `REPO` / `ACCESS_CODE` / `ALLOW_ORIGIN`）を渡せばそのまま動きます。
