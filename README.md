# 💡 アイデアBANK

**職場で気づいたアイデアを投稿すると、労働組合ポイントがもらえるサービス。**

> 会社を健全化させるには標準化をはじめとする業務改善が必要 —— でもそのノウハウやモチベーションは？
> まずは「気づき」を気軽に出し合える場をつくり、投稿にポイントで報いることで、
> 組合員の改善アイデアと参加意欲を可視化します。

サーバー不要。**GitHub Issues** を投稿箱に、**GitHub Actions** を集計エンジンに、
**GitHub Pages** をランキングボードにした、URL だけで完結する仕組みです。

---

## 仕組み

ユーザーが触れる画面は **すべて独自HTML**（GitHub は一切見えません）。
書き込みは小さなリレー経由で GitHub に渡り、あとは GitHub Actions が自動処理します。

```
[独自HTML 投稿フォーム docs/submit.html]
      │ POST(JSON)
      ▼
[リレー relay/worker.js（無料・秘密トークン保持）]
      │ repository_dispatch
      ▼
[GitHub Actions] → Issue 作成 → 自動採点 → docs/data/*.json を更新
      │
      ▼
[独自HTML 通帳ボード docs/index.html]  🏆 ランキング & 📥 アイデア台帳
```

1. **投稿** — 独自HTMLフォームに入力するだけ（基本 **+10pt**）。
2. **加点** — 執行部がステータスを進めるほど、みんなの 👍 が増えるほど加点。
3. **公開** — 通帳ボードにアイデアとポイントランキングが自動反映。

> GitHub の Issue フォーム（`?template=idea.yml`）も引き続き使えますが、
> 組合員向けの導線は独自HTMLの `submit.html` を推奨します。

## エンドポイント（URL）

| 用途 | URL |
| --- | --- |
| 🖊️ 投稿フォーム（独自HTML） | `https://NS-user.github.io/NS-idea-BANK/submit.html` |
| 📋 通帳ボード（独自HTML） | `https://NS-user.github.io/NS-idea-BANK/` |
| 🔌 API 的な生データ | `docs/data/ideas.json` / `points.json` / `summary.json` |
| 🤖 プログラム投稿（POST） | リレー URL、または `POST .../repos/NS-user/NS-idea-BANK/dispatches` |

### プログラムから投稿（他の GitHub Actions からもサクッと）

```bash
curl -X POST https://api.github.com/repos/NS-user/NS-idea-BANK/dispatches \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -d '{"event_type":"idea-submit","client_payload":{
        "title":"休憩室にウォーターサーバー","category":"福利厚生",
        "detail":"夏場の水分補給が不便","proposal":"サーバーを設置","author":"組合員A"}}'
```

他リポジトリのワークフローからは `peter-evans/repository-dispatch` などで同じ event_type を送るだけです。

## ポイント設計

| 項目 | 加点 | 付与のきっかけ |
| --- | --- | --- |
| 投稿ボーナス | **+10** | アイデアを投稿 |
| `status:検討中` | **+20** | 執行部が検討開始（ラベル付与） |
| `status:採用` | **+80** | 施策として採用決定 |
| `status:実装済み` | **+200** | 実際に職場へ反映 |
| 👍 リアクション | **+3 / 件** | 組合員の共感（👍❤️🎉🚀） |

※ ステータスは最も進んだ状態のみを採用（重複加算しません）。
配点は [`scripts/score.mjs`](scripts/score.mjs) 冒頭の定数を変えるだけで調整できます。

## セットアップ（5分）

1. このリポジトリを対象の Organization / アカウントに置く。
2. **Settings → Pages** で「Build and deployment」を **GitHub Actions** に設定。
3. **Actions → 「ラベル初期化」→ Run workflow** を実行（カテゴリ/ステータスのラベルを作成）。
4. **Actions → 「アイデア集計・ポイント付与」→ Run workflow** を一度実行して初期データを生成。
5. **リレーをデプロイ**して独自HTMLフォームから投稿できるようにする → [`relay/README.md`](relay/README.md)（約5分）。
6. **`docs/config.js`** の `endpoint` にリレー URL を設定して push。
7. 完了。あとは `submit.html` から投稿されるたびに自動集計されます。

> Actions が `docs/data` をコミットするため、リポジトリ設定の
> **Settings → Actions → General → Workflow permissions** を
> **Read and write permissions** にしてください。

## 開発

```bash
npm test        # 採点ロジックの単体テスト
# ローカルでデータ生成を試す:
node scripts/build-data.mjs sample.json docs/data
```

- [`scripts/score.mjs`](scripts/score.mjs) — 採点ロジック（純粋関数）
- [`scripts/build-data.mjs`](scripts/build-data.mjs) — `docs/data/*.json` 生成
- [`.github/workflows/`](.github/workflows/) — 集計・投稿エンドポイント・Pages 配信

## ライセンス

MIT
