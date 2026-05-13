/**
 * AIバード ウェビナー参加表明アンケート - 受信用 Google Apps Script
 *
 * セットアップ手順：
 * 1. 出力先スプレッドシートを開く
 *    https://docs.google.com/spreadsheets/d/1wFOukIE6ICLwDB_XkKY17GJaTPgdsBJO1gAfsXZirhs/edit
 * 2. メニュー：拡張機能 → Apps Script を開く
 * 3. このファイルの内容をコピー＆ペースト（既存コードは上書き）
 * 4. 下の SHEET_NAME を、書き込みたいシート名に合わせて修正
 *    （初回はそのままで OK。シートが無ければ自動作成します）
 * 5. 「デプロイ」 → 「新しいデプロイ」 → 種類「ウェブアプリ」
 *      - 次のユーザーとして実行：自分
 *      - アクセスできるユーザー：全員
 * 6. 表示された Web アプリ URL を控える
 * 7. このフロントエンドの .env.local に
 *      VITE_GAS_ENDPOINT=（コピーしたURL）
 *    を設定して再ビルド
 */

const SHEET_ID = "1wFOukIE6ICLwDB_XkKY17GJaTPgdsBJO1gAfsXZirhs";
const SHEET_NAME = "参加表明アンケート"; // 必要に応じて既存シート名に変更

const HEADERS = [
  "送信日時",
  "お名前",
  "Bird名/案件",
  "参加意思",
  "Claude Code利用状況",
  "案件の悩み",
  "事前質問",
  "ノウハウ共有可否",
  "ノウハウ内容",
  "診断コード",
  "診断タイトル",
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getOrCreateSheet_();

    sheet.appendRow([
      data.timestamp ? new Date(data.timestamp) : new Date(),
      data.name || "",
      data.birdName || "",
      labelAttendance_(data.attendance),
      labelUsage_(data.claudeUsage),
      data.concern || "",
      data.question || "",
      labelShare_(data.shareKnowhow),
      data.knowhowContent || "",
      data.diagnosisCode || "",
      data.diagnosisTitle || "",
    ]);

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// 動作確認用（ブラウザで URL を直接開いたとき）
function doGet() {
  return ContentService.createTextOutput("AI Bird Webinar Survey - GAS OK");
}

function getOrCreateSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  }
  return sheet;
}

function labelAttendance_(v) {
  switch (v) {
    case "live": return "リアル参加";
    case "archive": return "アーカイブ視聴";
    case "skip": return "不参加";
    default: return v || "";
  }
}
function labelUsage_(v) {
  switch (v) {
    case "none": return "未利用";
    case "tried": return "少し触った";
    case "weekly": return "週数回";
    case "daily": return "毎日ガッツリ";
    default: return v || "";
  }
}
function labelShare_(v) {
  switch (v) {
    case "ok-live": return "当日コメント発表OK";
    case "ok-share": return "代弁紹介OK";
    case "ng": return "今回はパス";
    default: return v || "";
  }
}
