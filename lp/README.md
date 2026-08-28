# AIバード「5時間無料モニター」LP

代理店がエンド顧客へ気軽に送るための、軽量な1ファイルLP。

- 本体: `aibird-5h-monitor.html`（CSS・JS内包／外部依存なし／スマホ縦画面前提・max-width 600px）
- 受信側: `../gas/monitor-lp-form.gs`（Google Apps Script）
- 出力先スプレッドシート: <https://docs.google.com/spreadsheets/d/1L6-UKhxfsKr51_LNFLRv_dCqe0hh70WS3-hI9Qnyb0s/edit>

## 確認方法

`aibird-5h-monitor.html` をブラウザで開くだけ（ダブルクリックでOK）。
スマホ表示の確認は、ブラウザの検証ツールで幅 375〜430px にすると実機に近くなります。

## 公開前にやること（3つ）

1. **フォームの送信先を設定**
   1. 上記スプレッドシートを開く → 拡張機能 → Apps Script
   2. `gas/monitor-lp-form.gs` の中身を貼り付けて保存
   3. デプロイ → 新しいデプロイ → ウェブアプリ（実行者=自分／アクセス=全員）
   4. 発行された `.../exec` URL を、`aibird-5h-monitor.html` 内の
      `var GAS_ENDPOINT = "";` に貼り付ける
   5. 通知メールが要る場合は `.gs` の `NOTIFY_TO` にアドレスを入れて再デプロイ
2. **公式LINEのURLを差し替え**
   `<a href="#" class="btn btn-line">` の `href` を実際のURL（例 `https://lin.ee/xxxx`）へ。
   ファイル内に「ここに公式LINEのURLを入れる」とコメントを残してあります。
3. **先着数の表記（未確定）**
   現状は「枠に限りがあり先着順」とぼかしています。
   数字を入れる場合は、HTML内の `先着◯社と明記する場合はここ` コメント3か所（ヒーローのバッジ／
   フォーム上の注意書き／CTA）を差し替えてください。

## メモ

- フォームは CORS プリフライトを避けるため `text/plain` + `mode:"no-cors"` で送信します。
  レスポンスは読めないため、送信後は常に完了メッセージを表示します（記録の確認はスプシで）。
- `GAS_ENDPOINT` が未設定のあいだは、送信時に「うまく送信できませんでした」を出し、
  予備の申込みフォーム（form.run）と公式LINEへ誘導します。
- 予備導線の申込みフォーム: <https://form.run/@writeup-2mQ35SCXFMMAN3BIBKah>
