/**
 * Store.gs — スプレッドシートへの読み書き（データアクセス層）
 *
 * 方針:
 *  - スプレッドシートが「唯一の正データ」。アプリが落ちてもここに全部残ります。
 *  - 紹介データの追加・更新は必ず 変更履歴 シートにも追記します（追記専用の台帳）。
 *    もし誰かが 紹介 シートの行を消しても、履歴からいつでも復元できます。
 */

/**
 * 操作対象のスプレッドシート。
 * 通常はこのスクリプトが紐づいているスプレッドシート。
 * スクリプトプロパティ TARGET_SPREADSHEET_ID が設定されていれば、そちらを開く。
 * （@gmail.com のアカウントでデプロイしつつ、書き込み先は弊社ドメインのスプレッドシート、という構成のため）
 */
function ss_() {
  var id = null;
  try { id = PropertiesService.getScriptProperties().getProperty('TARGET_SPREADSHEET_ID'); } catch (e) {}
  if (id) return SpreadsheetApp.openById(id);
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error('操作対象のスプレッドシートが決まっていません。エディタで setTargetSpreadsheetId("スプレッドシートID") を一度実行してください。');
  }
  return active;
}

function sheet_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) {
    throw new Error('シート「' + name + '」が見つかりません。メニュー［代理店ポータル］→［初期セットアップ／再点検］を実行してください。');
  }
  return sh;
}

/* ------------------------------------------------------------------ */
/* 汎用の読み書き                                                       */
/* ------------------------------------------------------------------ */

/**
 * データが入っている最終行を「ID列（A列）」だけで判定する。
 * 末尾に ARRAYFORMULA の列があると getLastRow() は数式の及ぶ行まで返してしまうため、
 * 追記位置の決定には必ずこちらを使うこと。
 */
function lastIdRow_(sheetName) {
  var sh = sheet_(sheetName);
  var last = sh.getLastRow();
  if (last < 2) return 1;
  var ids = sh.getRange(2, 1, last - 1, 1).getDisplayValues();
  for (var i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0]).trim() !== '') return i + 2;
  }
  return 1;
}

/** シート全体をオブジェクト配列で読む。_row に実際の行番号が入ります。 */
function readAll_(sheetName, fields) {
  var sh = sheet_(sheetName);
  var lastRow = lastIdRow_(sheetName);
  if (lastRow < 2) return [];
  var values = sh.getRange(2, 1, lastRow - 1, fields.length).getDisplayValues();
  var out = [];
  for (var r = 0; r < values.length; r++) {
    var row = values[r];
    if (String(row[0]).trim() === '') continue;   // ID空 = 未使用行
    var obj = { _row: r + 2 };
    for (var c = 0; c < fields.length; c++) obj[fields[c].k] = row[c];
    out.push(obj);
  }
  return out;
}

/** 数式列を避けて1行追記する */
function appendRow_(sheetName, fields, obj) {
  var sh = sheet_(sheetName);
  var width = writableWidth_(fields);
  var row = [];
  for (var i = 0; i < width; i++) {
    var v = obj[fields[i].k];
    row.push(v === undefined || v === null ? '' : v);
  }
  var target = lastIdRow_(sheetName) + 1;
  sh.getRange(target, 1, 1, width).setValues([row]);
  return target;
}

/** 数式列を避けて既存行を上書きする */
function writeRow_(sheetName, fields, rowNumber, obj) {
  var sh = sheet_(sheetName);
  var width = writableWidth_(fields);
  var row = [];
  for (var i = 0; i < width; i++) {
    var v = obj[fields[i].k];
    row.push(v === undefined || v === null ? '' : v);
  }
  sh.getRange(rowNumber, 1, 1, width).setValues([row]);
}

/* ------------------------------------------------------------------ */
/* 設定                                                                 */
/* ------------------------------------------------------------------ */

/** 設定シートを { キー: 値 } で返す（キャッシュはしない＝弊社の編集が即時反映される） */
function getSettings_() {
  var sh = ss_().getSheetByName(SHEETS.SETTING);
  var map = {};
  if (!sh) return map;
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return map;
  var values = sh.getRange(2, 1, lastRow - 1, 2).getDisplayValues();
  for (var i = 0; i < values.length; i++) {
    var k = String(values[i][0]).trim();
    if (k) map[k] = String(values[i][1]).trim();
  }
  return map;
}

function setSetting_(key, value) {
  var sh = sheet_(SHEETS.SETTING);
  var lastRow = Math.max(sh.getLastRow(), 1);
  var keys = sh.getRange(2, 1, Math.max(lastRow - 1, 1), 1).getDisplayValues();
  for (var i = 0; i < keys.length; i++) {
    if (String(keys[i][0]).trim() === key) {
      sh.getRange(i + 2, 2).setValue(value);
      return;
    }
  }
  sh.getRange(lastRow + 1, 1, 1, 2).setValues([[key, value]]);
}

/** 「A,B,C」形式の設定を配列にする */
function optionList_(settings, key, fallback) {
  var raw = settings[key];
  if (!raw) return fallback;
  var arr = raw.split(',').map(function (s) { return s.trim(); }).filter(String);
  return arr.length ? arr : fallback;
}

/* ------------------------------------------------------------------ */
/* 代理店                                                               */
/* ------------------------------------------------------------------ */

function listAgencies_() {
  return readAll_(SHEETS.AGENCY, AGENCY_FIELDS);
}

function findAgencyByToken_(token) {
  if (!token) return null;
  var t = String(token).trim();
  var all = listAgencies_();
  for (var i = 0; i < all.length; i++) {
    if (String(all[i].token).trim() === t) return all[i];
  }
  return null;
}

function findAgencyById_(id) {
  var all = listAgencies_();
  for (var i = 0; i < all.length; i++) {
    if (String(all[i].id).trim() === String(id).trim()) return all[i];
  }
  return null;
}

function nextAgencyId_() {
  var all = listAgencies_();
  var max = 0;
  for (var i = 0; i < all.length; i++) {
    var m = String(all[i].id).match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'AG-' + ('000' + (max + 1)).slice(-3);
}

/** 「20」「20%」「２０」などを数値に寄せる。空なら fallback。 */
function normalizeRate_(value, fallback) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return fallback === undefined ? '' : fallback;
  }
  var n = parseFloat(String(value).replace(/[^0-9.]/g, ''));
  if (isNaN(n)) return fallback === undefined ? '' : fallback;
  return Math.round(n * 100) / 100;
}

function newToken_() {
  return Utilities.getUuid().replace(/-/g, '').substring(0, 24);
}

/** 代理店を1件追加して返す */
function createAgency_(payload) {
  var now = new Date();
  var agency = {
    id: nextAgencyId_(),
    token: newToken_(),
    name: String(payload.name || '').trim(),
    contact: String(payload.contact || '').trim(),
    email: String(payload.email || '').trim(),
    phone: String(payload.phone || '').trim(),
    lpUrl: String(payload.lpUrl || '').trim(),
    lpNote: String(payload.lpNote || '').trim(),
    rate: normalizeRate_(payload.rate, 20),
    active: payload.active === '停止' ? '停止' : '有効',
    createdAt: Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd'),
    memo: String(payload.memo || '').trim()
  };
  if (!agency.name) throw new Error('代理店名は必須です。');
  appendRow_(SHEETS.AGENCY, AGENCY_FIELDS, agency);
  return agency;
}

function updateAgency_(payload) {
  var current = findAgencyById_(payload.id);
  if (!current) throw new Error('代理店が見つかりません: ' + payload.id);
  var next = {
    id: current.id,
    token: current.token,
    name: String(payload.name || current.name).trim(),
    contact: String(payload.contact !== undefined ? payload.contact : current.contact).trim(),
    email: String(payload.email !== undefined ? payload.email : current.email).trim(),
    phone: String(payload.phone !== undefined ? payload.phone : current.phone).trim(),
    lpUrl: String(payload.lpUrl !== undefined ? payload.lpUrl : current.lpUrl).trim(),
    lpNote: String(payload.lpNote !== undefined ? payload.lpNote : current.lpNote).trim(),
    rate: normalizeRate_(payload.rate !== undefined ? payload.rate : current.rate, 20),
    active: payload.active === '停止' ? '停止' : '有効',
    createdAt: current.createdAt,
    memo: String(payload.memo !== undefined ? payload.memo : current.memo).trim()
  };
  writeRow_(SHEETS.AGENCY, AGENCY_FIELDS, current._row, next);
  // 代理店名を変えたら、紹介シート側の代理店名も揃える
  if (next.name !== current.name) renameAgencyOnReferrals_(next.id, next.name);
  return next;
}

function renameAgencyOnReferrals_(agencyId, newName) {
  var sh = sheet_(SHEETS.REFERRAL);
  var lastRow = lastIdRow_(SHEETS.REFERRAL);
  if (lastRow < 2) return;
  var idCol = fieldIndex_(REFERRAL_FIELDS, 'agencyId') + 1;
  var nameCol = fieldIndex_(REFERRAL_FIELDS, 'agencyName') + 1;
  var ids = sh.getRange(2, idCol, lastRow - 1, 1).getDisplayValues();
  var names = sh.getRange(2, nameCol, lastRow - 1, 1).getValues();
  var changed = false;
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === agencyId && names[i][0] !== newName) {
      names[i][0] = newName;
      changed = true;
    }
  }
  if (changed) sh.getRange(2, nameCol, lastRow - 1, 1).setValues(names);
}

/** 新しいトークンを発行し直す（URLが漏れたときの遮断用） */
function rotateAgencyToken_(agencyId) {
  var a = findAgencyById_(agencyId);
  if (!a) throw new Error('代理店が見つかりません: ' + agencyId);
  var token = newToken_();
  var col = fieldIndex_(AGENCY_FIELDS, 'token') + 1;
  sheet_(SHEETS.AGENCY).getRange(a._row, col).setValue(token);
  return token;
}

/* ------------------------------------------------------------------ */
/* 紹介                                                                 */
/* ------------------------------------------------------------------ */

function listReferrals_() {
  return readAll_(SHEETS.REFERRAL, REFERRAL_FIELDS);
}

function listReferralsByAgency_(agencyId) {
  return listReferrals_().filter(function (r) {
    return String(r.agencyId).trim() === String(agencyId).trim();
  });
}

function findReferralById_(id) {
  var all = listReferrals_();
  for (var i = 0; i < all.length; i++) {
    if (String(all[i].id).trim() === String(id).trim()) return all[i];
  }
  return null;
}

function newReferralId_() {
  var stamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd');
  return 'R-' + stamp + '-' + Utilities.getUuid().replace(/-/g, '').substring(0, 6).toUpperCase();
}

function nowString_() {
  return Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
}

/**
 * 紹介を新規登録。
 * actor は「代理店名」または「弊社（管理画面）」。
 */
function createReferral_(agency, payload, actor) {
  var settings = getSettings_();
  var statuses = optionList_(settings, 'ステータス選択肢', ['新規']);
  var kind = payload.kind === KIND_PARTNER ? KIND_PARTNER : KIND_CUSTOMER;
  var rec = {
    id: newReferralId_(),
    createdAt: nowString_(),
    updatedAt: nowString_(),
    agencyId: agency.id,
    agencyName: agency.name,
    kind: kind,
    company: String(payload.company || '').trim(),
    name: String(payload.name || '').trim(),
    email: String(payload.email || '').trim(),
    phone: String(payload.phone || '').trim(),
    detail: String(payload.detail || '').trim(),
    product: kind === KIND_CUSTOMER ? String(payload.product || '').trim() : '',
    status: statuses.indexOf(payload.status) >= 0 ? payload.status : statuses[0],
    lostReason: '',
    ownership: '',
    rateSelf: '',
    rateTarget: '',
    partnerLp: '',
    briefing: BRIEFING_STATES[0],
    briefingId: '',
    briefingAt: '',
    nextAction: '',
    memo: '',
    updatedBy: actor
  };
  if (!rec.name) throw new Error('氏名は必須です。');
  applyPartnerTerms_(rec, payload, agency, settings);

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    appendRow_(SHEETS.REFERRAL, REFERRAL_FIELDS, rec);
    writeLog_('新規', rec, actor, {});
  } finally {
    lock.releaseLock();
  }
  notifyNewReferral_(rec, settings);
  return rec;
}

/**
 * 紹介を更新。allowedKeys に含まれるキーだけを反映します
 * （代理店からは 弊社メモ 等を触らせないため）。
 */
function updateReferral_(referralId, payload, allowedKeys, actor) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var current = findReferralById_(referralId);
    if (!current) throw new Error('対象の紹介が見つかりません: ' + referralId);

    var next = {};
    for (var i = 0; i < REFERRAL_FIELDS.length; i++) {
      var k = REFERRAL_FIELDS[i].k;
      if (REFERRAL_FIELDS[i].formula) continue;
      next[k] = current[k];
    }
    var changes = {};
    for (var j = 0; j < allowedKeys.length; j++) {
      var key = allowedKeys[j];
      if (payload[key] === undefined) continue;
      var v = String(payload[key]).trim();
      if (v !== String(current[key] || '')) {
        changes[key] = { from: current[key] || '', to: v };
        next[key] = v;
      }
    }
    // 種別を顧客紹介以外に変えたら興味商材はクリア
    if (next.kind !== KIND_CUSTOMER) next.product = '';
    // 失注以外になったら失注理由はクリア
    if (next.status !== '失注') next.lostReason = '';
    // 代理店候補の条件（管理方式・マージン・候補用LP）を整える
    applyPartnerTerms_(next, next, findAgencyById_(next.agencyId), getSettings_());
    // 説明会の日程が選ばれていれば日時を埋める
    syncBriefingTime_(next);

    if (Object.keys(changes).length === 0) return current;

    next.updatedAt = nowString_();
    next.updatedBy = actor;
    writeRow_(SHEETS.REFERRAL, REFERRAL_FIELDS, current._row, next);
    writeLog_(changes.status ? 'ステータス変更' : '更新', next, actor, changes);
    next._row = current._row;
    return next;
  } finally {
    lock.releaseLock();
  }
}

/**
 * 代理店候補（代理店紹介）の取り分まわりを整える。
 *
 *   トスアップ … 弊社がすべて対応する。紹介元には設定の固定％が入る。
 *   自己管理   … 代理店が自分で候補を管理し、自分の基本マージン率を候補と分け合う。
 *                （例：基本20% → 候補15% / 自分5%）
 */
function applyPartnerTerms_(rec, payload, agency, settings) {
  if (rec.kind !== KIND_PARTNER) {
    rec.ownership = '';
    rec.rateSelf = '';
    rec.rateTarget = '';
    rec.partnerLp = '';
    return;
  }
  var ownership = String(payload.ownership || rec.ownership || '').trim();
  if (OWNERSHIPS.indexOf(ownership) < 0) ownership = OWNERSHIP_TOSS;
  rec.ownership = ownership;

  var base = normalizeRate_(agency && agency.rate, 20);
  var tossRate = normalizeRate_(settings['トスアップ時の紹介元マージン(%)'], 3);

  if (ownership === OWNERSHIP_TOSS) {
    rec.rateSelf = normalizeRate_(payload.rateSelf !== undefined && payload.rateSelf !== ''
      ? payload.rateSelf : (rec.rateSelf !== '' && rec.rateSelf !== undefined ? rec.rateSelf : tossRate), tossRate);
    rec.rateTarget = '';   // 候補は弊社と直接契約するので、紹介元は関与しない
  } else {
    rec.rateSelf = normalizeRate_(payload.rateSelf, '');
    rec.rateTarget = normalizeRate_(payload.rateTarget, '');
    var sum = (rec.rateSelf === '' ? 0 : rec.rateSelf) + (rec.rateTarget === '' ? 0 : rec.rateTarget);
    if (base !== '' && sum > base + 0.001) {
      throw new Error('取り分の合計が ' + sum + '% で、御社の基本マージン ' + base + '% を超えています。合計が ' + base + '% 以内になるように調整してください。');
    }
  }
  if (payload.partnerLp !== undefined) rec.partnerLp = String(payload.partnerLp || '').trim();
}

/** 希望日程IDから説明会日時を埋める（日程が消えていたら日時はそのまま残す） */
function syncBriefingTime_(rec) {
  var id = String(rec.briefingId || '').trim();
  if (!id) return;
  var list = listBriefings_();
  for (var i = 0; i < list.length; i++) {
    if (String(list[i].id).trim() === id) { rec.briefingAt = list[i].startAt; return; }
  }
}

/* ------------------------------------------------------------------ */
/* 説明会日程                                                           */
/* ------------------------------------------------------------------ */

function listBriefings_() {
  return readAll_(SHEETS.BRIEFING, BRIEFING_FIELDS);
}

/** 代理店に見せる日程（公開中かつ未来のもの）を開催順で返す */
function openBriefings_() {
  var today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd');
  return listBriefings_()
    .filter(function (b) {
      if (!isTrue_(b.open)) return false;
      var d = String(b.startAt || '').slice(0, 10).replace(/-/g, '/');
      return !d || d >= today;
    })
    .sort(function (a, b) { return String(a.startAt).localeCompare(String(b.startAt)); });
}

function nextBriefingId_() {
  return 'B-' + ('00' + (maxSeq_(listBriefings_()) + 1)).slice(-3);
}

function saveBriefing_(payload) {
  var rec = {
    id: String(payload.id || '').trim() || nextBriefingId_(),
    startAt: String(payload.startAt || '').trim(),
    kind: String(payload.kind || '代理店向け説明会').trim(),
    capacity: String(payload.capacity || '').trim(),
    url: String(payload.url || '').trim(),
    note: String(payload.note || '').trim(),
    open: payload.open ? 'TRUE' : 'FALSE'
  };
  if (!rec.startAt) throw new Error('開催日時は必須です。');
  var existing = null;
  listBriefings_().forEach(function (b) { if (b.id === rec.id) existing = b; });
  if (existing) writeRow_(SHEETS.BRIEFING, BRIEFING_FIELDS, existing._row, rec);
  else appendRow_(SHEETS.BRIEFING, BRIEFING_FIELDS, rec);
  return rec;
}

/* ------------------------------------------------------------------ */
/* 文面テンプレート                                                     */
/* ------------------------------------------------------------------ */

function listTemplates_() {
  return readAll_(SHEETS.TEMPLATE, TEMPLATE_FIELDS)
    .filter(function (t) { return isTrue_(t.open); })
    .sort(function (a, b) { return (Number(a.order) || 999) - (Number(b.order) || 999); });
}

function saveTemplate_(payload) {
  var rec = {
    id: String(payload.id || '').trim() || ('T-' + ('00' + (maxSeq_(readAll_(SHEETS.TEMPLATE, TEMPLATE_FIELDS)) + 1)).slice(-3)),
    order: String(payload.order || '10').trim(),
    target: String(payload.target || 'お客様').trim(),
    channel: String(payload.channel || 'LINE').trim(),
    angle: String(payload.angle || '').trim(),
    title: String(payload.title || '').trim(),
    body: String(payload.body || '').trim(),
    open: payload.open ? 'TRUE' : 'FALSE'
  };
  if (!rec.title || !rec.body) throw new Error('見出しと本文は必須です。');
  var existing = null;
  readAll_(SHEETS.TEMPLATE, TEMPLATE_FIELDS).forEach(function (t) { if (t.id === rec.id) existing = t; });
  if (existing) writeRow_(SHEETS.TEMPLATE, TEMPLATE_FIELDS, existing._row, rec);
  else appendRow_(SHEETS.TEMPLATE, TEMPLATE_FIELDS, rec);
  return rec;
}

/* ------------------------------------------------------------------ */
/* 共通の小道具                                                         */
/* ------------------------------------------------------------------ */

/** チェックボックス列や「TRUE」「掲載」「○」を真偽値にする */
function isTrue_(v) {
  var s = String(v).trim().toUpperCase();
  return s === 'TRUE' || s === '掲載' || s === '公開' || s === '○' || s === '◯' || s === 'ON' || s === '1';
}

/** ID末尾の連番の最大値 */
function maxSeq_(rows) {
  var max = 0;
  for (var i = 0; i < rows.length; i++) {
    var m = String(rows[i].id).match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

/* ------------------------------------------------------------------ */
/* お知らせ・LP                                                         */
/* ------------------------------------------------------------------ */

function listNotices_() {
  return readAll_(SHEETS.NOTICE, NOTICE_FIELDS);
}

/** 代理店マイページに出すお知らせ（掲載ONかつ対象一致）を表示順で返す */
function noticesForAgency_(agencyId) {
  return listNotices_()
    .filter(function (n) {
      if (!isTrue_(n.published)) return false;
      var t = String(n.target || '').trim();
      if (!t || t === '全体' || t === 'ALL') return true;
      return t.split(',').map(function (s) { return s.trim(); }).indexOf(String(agencyId).trim()) >= 0;
    })
    .sort(function (a, b) { return (Number(a.order) || 999) - (Number(b.order) || 999); });
}

function nextNoticeId_() {
  return 'N-' + ('00' + (maxSeq_(listNotices_()) + 1)).slice(-3);
}

function saveNotice_(payload) {
  var rec = {
    id: String(payload.id || '').trim() || nextNoticeId_(),
    order: String(payload.order || '').trim() || '10',
    kind: String(payload.kind || 'お知らせ').trim(),
    title: String(payload.title || '').trim(),
    body: String(payload.body || '').trim(),
    url: String(payload.url || '').trim(),
    btnLabel: String(payload.btnLabel || '').trim(),
    target: String(payload.target || '全体').trim() || '全体',
    published: payload.published ? 'TRUE' : 'FALSE',
    updatedAt: nowString_()
  };
  if (!rec.title) throw new Error('タイトルは必須です。');
  var existing = null;
  var all = listNotices_();
  for (var i = 0; i < all.length; i++) if (all[i].id === rec.id) existing = all[i];
  if (existing) writeRow_(SHEETS.NOTICE, NOTICE_FIELDS, existing._row, rec);
  else appendRow_(SHEETS.NOTICE, NOTICE_FIELDS, rec);
  return rec;
}

/* ------------------------------------------------------------------ */
/* 変更履歴（追記専用）                                                 */
/* ------------------------------------------------------------------ */

function writeLog_(action, rec, actor, changes) {
  try {
    var sh = ss_().getSheetByName(SHEETS.LOG);
    if (!sh) return;
    var snapshot = {};
    for (var i = 0; i < REFERRAL_FIELDS.length; i++) {
      var f = REFERRAL_FIELDS[i];
      if (f.formula) continue;
      snapshot[f.h] = rec[f.k] || '';
    }
    var changeText = Object.keys(changes || {}).map(function (k) {
      return k + ': 「' + changes[k].from + '」→「' + changes[k].to + '」';
    }).join(' / ');
    sh.appendRow([
      nowString_(), action, rec.id, rec.agencyId, rec.agencyName, actor,
      changeText, JSON.stringify(snapshot)
    ]);
  } catch (err) {
    console.error('変更履歴の書き込みに失敗: ' + err);
  }
}

/* ------------------------------------------------------------------ */
/* 通知メール                                                           */
/* ------------------------------------------------------------------ */

function notifyNewReferral_(rec, settings) {
  try {
    if (String(settings['新規登録メール通知'] || 'ON').toUpperCase() === 'OFF') return;
    var to = String(settings['通知先メールアドレス'] || '').trim();
    if (!to) return;
    var subject = '[代理店ポータル] ' + rec.agencyName + ' から' + rec.kind + '：' + (rec.name || '（氏名未入力）');
    var lines = [
      '代理店: ' + rec.agencyName + '（' + rec.agencyId + '）',
      '種別: ' + rec.kind,
      '会社名: ' + (rec.company || '—'),
      '氏名: ' + (rec.name || '—'),
      'メール: ' + (rec.email || '—'),
      '電話: ' + (rec.phone || '—'),
      '興味商材: ' + (rec.product || '—'),
      '詳しい情報: ' + (rec.detail || '—'),
      '',
      '紹介ID: ' + rec.id,
      '登録日時: ' + rec.createdAt
    ];
    var adminUrl = String(settings['管理画面URL'] || '').trim();
    if (adminUrl) lines.push('', '管理画面: ' + adminUrl);
    MailApp.sendEmail({ to: to, subject: subject, body: lines.join('\n') });
  } catch (err) {
    console.error('通知メールの送信に失敗: ' + err);
  }
}
