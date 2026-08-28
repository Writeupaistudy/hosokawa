/**
 * AIバード「5時間無料モニター」LP お問い合わせフォーム — 受信用 Google Apps Script
 *
 * 送信内容を、下記スプレッドシートに1行ずつ追記します。
 * 出力先: https://docs.google.com/spreadsheets/d/1L6-UKhxfsKr51_LNFLRv_dCqe0hh70WS3-hI9Qnyb0s/edit
 *
 * セットアップ手順：
 * 1. 上のスプレッドシートを開く
 * 2. メニュー：拡張機能 → Apps Script
 * 3. このファイルの中身をまるごとコピー＆ペースト（既存コードは置き換え）
 * 4. 「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」
 *      - 次のユーザーとして実行：自分
 *      - アクセスできるユーザー：全員
 * 5. 表示された Web アプリ URL（https://script.google.com/macros/s/.../exec）をコピー
 * 6. lp/aibird-5h-monitor.html の中の
 *      var GAS_ENDPOINT = "";
 *    に、そのURLを貼り付ける
 *
 * ※ コードを変更したら、必ず「デプロイを管理」→ 鉛筆アイコン →
 *    バージョン「新バージョン」で再デプロイしてください（URLは変わりません）。
 */

const SHEET_ID = "1L6-UKhxfsKr51_LNFLRv_dCqe0hh70WS3-hI9Qnyb0s";
const SHEET_NAME = "問い合わせ";

// 通知メールを受け取りたい場合はアドレスを入れる（空なら送信しません）
const NOTIFY_TO = "";

const HEADERS = [
  "受信日時",
  "会社名",
  "お名前",
  "メールアドレス",
  "電話番号",
  "気になるもの",
  "やってみたいこと・ひとこと",
  "送信元ページ",
];

function doPost(e) {
  try {
    const data = parseBody_(e);
    const sheet = getOrCreateSheet_();

    const row = [
      data.timestamp ? new Date(data.timestamp) : new Date(),
      data.company || "",
      data.name || "",
      data.email || "",
      data.tel || "",
      data.topic || "（未選択／相談したい）",
      data.message || "",
      data.source || "",
    ];
    sheet.appendRow(row);

    notify_(row);

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// 動作確認用（ブラウザで URL を直接開いたとき）
function doGet() {
  return ContentService.createTextOutput("AI Bird 5h Monitor LP - GAS OK");
}

/**
 * LP からは CORS のプリフライトを避けるため text/plain で JSON を送っています。
 * 念のため、通常のフォーム形式（application/x-www-form-urlencoded）でも受け取れるようにしています。
 */
function parseBody_(e) {
  if (e && e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (ignore) {
      // JSON でなければ下のパラメータ側にフォールバック
    }
  }
  return (e && e.parameter) || {};
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
    sheet.setColumnWidth(1, 150);
    sheet.setColumnWidth(7, 320);
  }
  return sheet;
}

function notify_(row) {
  if (!NOTIFY_TO) return;
  try {
    const body = HEADERS.map(function (h, i) {
      return h + "： " + row[i];
    }).join("\n");
    MailApp.sendEmail(
      NOTIFY_TO,
      "【AIバード】5時間無料モニターのお問い合わせが届きました",
      body + "\n\nスプレッドシート:\nhttps://docs.google.com/spreadsheets/d/" + SHEET_ID + "/edit"
    );
  } catch (ignore) {
    // 通知に失敗しても、シートへの記録は成功として扱う
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
