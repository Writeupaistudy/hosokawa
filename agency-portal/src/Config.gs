/**
 * Config.gs — シート構成・定数・設定値へのアクセス
 *
 * このファイルだけ見れば「どのシートに何が入るか」が分かるようにしてあります。
 * 列を増やしたいときは、対応する *_FIELDS に { k, h } を足して
 * メニュー［代理店ポータル］→［初期セットアップ／再点検］を実行してください。
 */

/** シート名。ここを変えるとシート名が変わります（既存シートがある場合は手動リネームが必要） */
const SHEETS = {
  AGENCY: '代理店マスタ',
  REFERRAL: '紹介',
  NOTICE: 'お知らせ・LP',
  LOG: '変更履歴',
  DASHBOARD: 'ダッシュボード',
  SETTING: '設定'
};

/**
 * 列定義。
 *   k       … プログラム内で使うキー
 *   h       … シートの見出し
 *   w       … 列幅(px)
 *   formula … true の列は「数式で自動計算される列」。スクリプトは絶対に書き込みません。
 *             （数式列は必ず末尾にまとめて配置すること）
 */
const AGENCY_FIELDS = [
  { k: 'id',        h: '代理店ID',         w: 100 },
  { k: 'token',     h: 'アクセストークン',  w: 230 },
  { k: 'name',      h: '代理店名',          w: 200 },
  { k: 'contact',   h: '担当者名',          w: 120 },
  { k: 'email',     h: 'メールアドレス',    w: 200 },
  { k: 'phone',     h: '電話番号',          w: 130 },
  { k: 'lpUrl',     h: '専用LP_URL',        w: 320 },
  { k: 'lpNote',    h: 'LPメモ',            w: 200 },
  { k: 'active',    h: '状態',              w: 80  },
  { k: 'createdAt', h: '登録日',            w: 100 },
  { k: 'memo',      h: '備考',              w: 240 },
  { k: 'mypageUrl', h: 'マイページURL',     w: 380, formula: true }
];

const REFERRAL_FIELDS = [
  { k: 'id',         h: '紹介ID',          w: 150 },
  { k: 'createdAt',  h: '登録日時',        w: 140 },
  { k: 'updatedAt',  h: '更新日時',        w: 140 },
  { k: 'agencyId',   h: '代理店ID',        w: 90  },
  { k: 'agencyName', h: '代理店名',        w: 180 },
  { k: 'kind',       h: '種別',            w: 100 },
  { k: 'company',    h: '会社名',          w: 200 },
  { k: 'name',       h: '氏名',            w: 140 },
  { k: 'email',      h: 'メールアドレス',   w: 220 },
  { k: 'phone',      h: '電話番号',        w: 140 },
  { k: 'detail',     h: '詳しい情報',      w: 380 },
  { k: 'product',    h: '興味商材',        w: 120 },
  { k: 'status',     h: 'ステータス',      w: 120 },
  { k: 'lostReason', h: '失注理由',        w: 160 },
  { k: 'nextAction', h: '次回アクション日', w: 120 },
  { k: 'memo',       h: '弊社メモ',        w: 300 },
  { k: 'updatedBy',  h: '最終更新者',      w: 160 },
  { k: 'fillState',  h: '情報の充足',      w: 200, formula: true }
];

const NOTICE_FIELDS = [
  { k: 'id',        h: 'ID',           w: 90  },
  { k: 'order',     h: '表示順',       w: 70  },
  { k: 'kind',      h: '種別',         w: 110 },
  { k: 'title',     h: 'タイトル',     w: 260 },
  { k: 'body',      h: '本文',         w: 420 },
  { k: 'url',       h: 'リンクURL',    w: 320 },
  { k: 'btnLabel',  h: 'ボタン文言',   w: 140 },
  { k: 'target',    h: '対象',         w: 160 },
  { k: 'published', h: '掲載',         w: 70  },
  { k: 'updatedAt', h: '更新日時',     w: 140 }
];

const LOG_FIELDS = [
  { k: 'at',         h: '日時',       w: 150 },
  { k: 'action',     h: '操作',       w: 110 },
  { k: 'referralId', h: '紹介ID',     w: 150 },
  { k: 'agencyId',   h: '代理店ID',   w: 90  },
  { k: 'agencyName', h: '代理店名',   w: 160 },
  { k: 'actor',      h: '操作者',     w: 160 },
  { k: 'changes',    h: '変更内容',   w: 420 },
  { k: 'snapshot',   h: 'スナップショット', w: 520 }
];

/** 「情報が足りているか」の判定に使う項目（代理店に入力してもらいたい項目） */
const REQUIRED_KEYS = ['company', 'name', 'email', 'phone', 'detail'];
const REQUIRED_LABELS = { company: '会社名', name: '氏名', email: 'メール', phone: '電話', detail: '詳細' };

/** 種別 */
const KIND_CUSTOMER = '顧客紹介';
const KIND_PARTNER  = '代理店紹介';

/**
 * 設定シートの初期値。行の順番＝設定シートの行順です。
 * B3（ウェブアプリURL）には名前付き範囲 WEBAPP_URL が付きます。
 */
const DEFAULT_SETTINGS = [
  { key: '会社名',                 value: '弊社',  note: 'マイページのヘッダーに表示されます' },
  { key: 'ウェブアプリURL',        value: '',      note: 'デプロイ後の /exec URL を貼り付けてください。マイページURLと管理画面URLが自動生成されます' },
  { key: '管理者トークン',         value: '',      note: '管理画面のパスワード相当。初期セットアップ時に自動発行されます' },
  { key: '管理画面URL',            value: '',      note: '自動計算。ここを開くと管理画面に入れます（社内のみで共有）' },
  { key: '通知先メールアドレス',   value: '',      note: '新規紹介が登録されたときの通知先。カンマ区切りで複数可' },
  { key: '新規登録メール通知',     value: 'ON',    note: 'ON / OFF' },
  { key: '代理店によるステータス編集', value: '許可', note: '許可 / 不可。「不可」にすると代理店は閲覧のみになります' },
  { key: 'ステータス選択肢',       value: '新規,アプローチ中,商談中,稼働中,保留,失注,取り下げ', note: 'カンマ区切り。ここを編集するとアプリの選択肢が即時に変わります' },
  { key: '失注理由選択肢',         value: 'ニーズなし,代理店化を辞退,音信不通,予算が合わない,競合他社に決定,時期尚早,その他', note: 'カンマ区切り' },
  { key: '興味商材選択肢',         value: 'AIバード,AI活用研修,両方,未定', note: 'カンマ区切り（顧客紹介のときだけ使います）' },
  { key: '代理店ページの案内文',   value: 'ご紹介いただける方の情報をこちらに登録してください。LINEに流れず、進捗もこの画面で確認できます。', note: 'マイページ上部に表示される説明文' }
];

/** 代理店マスタの「マイページURL」列が参照する名前付き範囲（＝設定シートのウェブアプリURLのセル） */
const NAMED_RANGE_WEBAPP = 'WEBAPP_URL';

/** ステータスごとの色（シートの条件付き書式 & アプリのバッジ色） */
const STATUS_COLORS = {
  '新規':         { bg: '#e8f0fe', fg: '#1a56c4' },
  'アプローチ中': { bg: '#fff4e0', fg: '#a55a00' },
  '商談中':       { bg: '#efe6ff', fg: '#6b34c9' },
  '稼働中':       { bg: '#e3f6e9', fg: '#137a3d' },
  '保留':         { bg: '#f0f1f3', fg: '#5a616b' },
  '失注':         { bg: '#fde8e8', fg: '#b3261e' },
  '取り下げ':     { bg: '#f0f1f3', fg: '#5a616b' }
};

/* ------------------------------------------------------------------ */
/* 小さなヘルパー                                                       */
/* ------------------------------------------------------------------ */

function headersOf_(fields) {
  return fields.map(function (f) { return f.h; });
}

/** 数式列を除いた「スクリプトが書き込んでよい列数」 */
function writableWidth_(fields) {
  var n = 0;
  for (var i = 0; i < fields.length; i++) {
    if (fields[i].formula) break;
    n++;
  }
  return n;
}

function fieldIndex_(fields, key) {
  for (var i = 0; i < fields.length; i++) if (fields[i].k === key) return i;
  return -1;
}

function statusColor_(status) {
  return STATUS_COLORS[status] || { bg: '#f0f1f3', fg: '#5a616b' };
}
