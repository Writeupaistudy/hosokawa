> **このリポジトリには複数のアプリが入っています**
> - ルート（`src/`, `gas/`）… AIバード ウェビナー参加表明クエスト（以下）
> - [`agency-portal/`](./agency-portal/) … 代理店ポータル（代理店マイページ + 管理画面 + スプレッドシート）

# 🐦 AIバード ウェビナー参加表明クエスト

第1回 Bird向け勉強会「Claude Codeを使った案件運用ノウハウ ― 今日から使える実践編」（2026/5/14）のための、**参加表明 × 事前質問 × ノウハウ募集** Web アンケート。

- **3ステップで約60秒**（必須は最初のステップだけ。残り2つはスキップ可）
- ピクセル風（レトロゲーム風）UI で **回答した気にさせない遊び心**
- 回答後にその場で **おみくじ風 AI活用診断** + **Claude Code 初期設定マニュアル** をプレゼント
- 回答結果は **Google スプレッドシート（指定済み）** に Apps Script 経由で自動追記

スプレッドシート: <https://docs.google.com/spreadsheets/d/1wFOukIE6ICLwDB_XkKY17GJaTPgdsBJO1gAfsXZirhs/edit?gid=662884306#gid=662884306>

---

## セットアップ

### 1. GAS（Google Apps Script）側 — 受信エンドポイントを用意

1. 上記スプレッドシートを開く
2. **拡張機能 → Apps Script** を開く
3. `gas/Code.gs` の中身をコピー＆ペースト（既存コードは置き換え）
4. 必要に応じて `SHEET_NAME` を既存シート名に書き換え（無ければ自動生成）
5. **デプロイ → 新しいデプロイ → ウェブアプリ**
   - 次のユーザーとして実行：自分
   - アクセスできるユーザー：全員
6. 表示された **Web アプリ URL** を控える（`https://script.google.com/macros/s/.../exec`）

### 2. フロントエンド側

```bash
cp .env.example .env.local
# .env.local の VITE_GAS_ENDPOINT に GAS の URL を貼り付け

npm install
npm run dev      # 開発サーバ（http://localhost:5173）
npm run build    # 本番ビルド → dist/
```

### 3. デプロイ

`dist/` を静的ホスティングへ。おすすめ：

- **Vercel** … リポジトリ連携で push 即デプロイ
- **Cloudflare Pages** / **Netlify** … 同上
- **GitHub Pages** … `dist` を `gh-pages` ブランチに push

ホスティング側の環境変数に `VITE_GAS_ENDPOINT` を設定するのを忘れずに。

---

## ファイル構成

```
src/
  App.tsx            画面遷移ルーティング
  types.ts           フォーム型
  diagnosis.ts       おみくじ風診断ロジック（5タイプ）
  submit.ts          GAS Web App への送信
  screens/
    Start.tsx        スタート画面（アジェンダ含む）
    StepFrame.tsx    共通のステップ枠（プログレスバー）
    Step1.tsx        必須：お名前 / Bird名 / 参加意思
    Step2.tsx        任意：Claude Code利用状況 / 案件の悩み
    Step3.tsx        任意：事前質問 / ノウハウ共有
    Result.tsx       診断結果 + 特典配布
gas/
  Code.gs            スプレッドシート書き込み用 Apps Script
public/
  bird.svg           ファビコン（ピクセルアート）
```

## スプシに書き込まれるカラム

| 列 | 内容 |
| --- | --- |
| 送信日時 | ISO日時から自動 |
| お名前 | 必須 |
| Bird名/案件 | 任意 |
| 参加意思 | リアル参加 / アーカイブ視聴 / 不参加 |
| Claude Code利用状況 | 未利用〜毎日ガッツリ |
| 案件の悩み | 自由記述 |
| 事前質問 | 自由記述 |
| ノウハウ共有可否 | 当日コメント発表 / 代弁紹介 / パス |
| ノウハウ内容 | 自由記述 |
| 診断コード | SAGE / SCOUT / EXPLORER / HATCHLING / ARCHIVIST |
| 診断タイトル | 表示用 |

## 配布する特典

1. **Claude Code 初期設定 スクショ付きマニュアル** — `Result.tsx` のリンクを差し替えれば配布可能（現状は「準備中」アラート）
2. **おみくじ風 AI活用診断** — 回答内容に応じて5タイプから1つ。シェア文コピーボタン付き。

## 今後の差し替えポイント

- マニュアルPDFが完成したら `Result.tsx` の「ダウンロード（準備中）」ボタンの `onClick` を `href` に差し替え
- 当日のZoom URLは Result 画面の「当日の参加方法」セクションに追記
- 診断タイプを増やしたい場合は `src/diagnosis.ts` の `DIAGNOSES` に追加
