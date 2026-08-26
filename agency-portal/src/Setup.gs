/**
 * Setup.gs — スプレッドシートの初期構築とメニュー
 *
 * 何度実行しても壊れません。列を増やした場合は、既存データを保ったまま
 * 正しい位置に列を挿入します（alignColumns_）。
 */

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('代理店ポータル')
      .addItem('初期セットアップ／再点検', 'setupSpreadsheet')
      .addSeparator()
      .addItem('URL一覧を表示', 'showUrls')
      .addItem('代理店を追加', 'promptAddAgency')
      .addItem('説明会の日程を追加', 'promptAddBriefing')
      .addSeparator()
      .addItem('管理者トークンを再発行', 'regenerateAdminToken')
      .addToUi();
  } catch (err) {
    // スタンドアロン構成（スプレッドシートに紐づいていない）ではメニューを出せない
  }
}

/**
 * 別アカウントのApps Scriptから弊社のスプレッドシートを操作する構成にするとき、
 * エディタでこの関数を一度だけ実行します（引数に対象のスプレッドシートIDを入れて保存）。
 */
function setTargetSpreadsheetId(id) {
  var value = String(id || '').trim();
  if (!value) throw new Error('スプレッドシートIDを引数に渡してください。URLの /d/ と /edit の間の文字列です。');
  PropertiesService.getScriptProperties().setProperty('TARGET_SPREADSHEET_ID', value);
  var name = SpreadsheetApp.openById(value).getName();
  console.log('対象スプレッドシートを「' + name + '」に設定しました。続けて setupSpreadsheet() を実行してください。');
  return name;
}

/** メインのセットアップ処理 */
function setupSpreadsheet() {
  buildSettingSheet_();   // 設定シートは独自レイアウト（キー／値／説明）

  buildSheet_(SHEETS.AGENCY, AGENCY_FIELDS, '#17395b');
  buildSheet_(SHEETS.REFERRAL, REFERRAL_FIELDS, '#2f5d3f');
  buildSheet_(SHEETS.NOTICE, NOTICE_FIELDS, '#8a5a1e');
  buildSheet_(SHEETS.BRIEFING, BRIEFING_FIELDS, '#5b4b8a');
  buildSheet_(SHEETS.TEMPLATE, TEMPLATE_FIELDS, '#1e6a72');
  buildSheet_(SHEETS.LOG, LOG_FIELDS, '#5a616b');

  buildFormulaColumns_();
  buildValidations_();
  buildConditionalFormats_();
  buildDashboard_();
  seedTemplates_();

  var settings = getSettings_();
  if (!settings['管理者トークン']) setSetting_('管理者トークン', newToken_());

  reorderSheets_();
  try { ss_().toast('セットアップが完了しました。', '代理店ポータル', 5); } catch (e) {}
}

/* ------------------------------------------------------------------ */

function ensureSheet_(name) {
  var ss = ss_();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

/**
 * 見出しを期待どおりに揃える。
 * すでにデータがある状態で列定義に項目を足した場合、
 * 見出しを上書きすると値が1列ずつズレてしまうので、足りない列を挿入して位置を合わせる。
 */
function alignColumns_(sh, fields) {
  var expected = headersOf_(fields);
  var lastCol = Math.max(sh.getLastColumn(), 1);
  var current = sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0]
    .map(function (v) { return String(v).trim(); });
  var hasData = sh.getLastRow() > 1;
  if (!hasData) return;                       // データがなければ、そのまま上書きしてよい

  for (var i = 0; i < expected.length; i++) {
    if (current[i] === expected[i]) continue;
    if (current.indexOf(expected[i]) >= 0) continue;   // 別の位置にある。並べ替えは自動では行わない
    sh.insertColumnBefore(i + 1);
    sh.getRange(1, i + 1).setValue(expected[i]);
    current.splice(i, 0, expected[i]);
  }
}

/** 見出し行・書式・列幅を整える（既存データは消しません） */
function buildSheet_(name, fields, headerColor) {
  var sh = ensureSheet_(name);
  var headers = headersOf_(fields);

  if (sh.getMaxColumns() < headers.length) {
    sh.insertColumnsAfter(sh.getMaxColumns(), headers.length - sh.getMaxColumns());
  }
  alignColumns_(sh, fields);

  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  sh.getRange(1, 1, 1, headers.length)
    .setBackground(headerColor)
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setVerticalAlignment('middle');
  sh.setRowHeight(1, 34);
  sh.setFrozenRows(1);
  if (name === SHEETS.REFERRAL || name === SHEETS.AGENCY) sh.setFrozenColumns(1);

  for (var i = 0; i < fields.length; i++) sh.setColumnWidth(i + 1, fields[i].w || 140);

  var maxRows = sh.getMaxRows();
  if (maxRows > 1) {
    sh.getRange(2, 1, maxRows - 1, headers.length)
      .setVerticalAlignment('top')
      .setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
  }
}

/** 設定シートは キー / 値 / 説明 の3列 */
function buildSettingSheet_() {
  var sh = ensureSheet_(SHEETS.SETTING);
  var existing = getSettings_();

  sh.getRange(1, 1, 1, 3).setValues([['設定キー', '値', '説明']])
    .setBackground('#2b2b28').setFontColor('#ffffff').setFontWeight('bold');
  sh.setFrozenRows(1);
  sh.setColumnWidth(1, 240);
  sh.setColumnWidth(2, 440);
  sh.setColumnWidth(3, 560);

  var rows = DEFAULT_SETTINGS.map(function (s) {
    var value = existing[s.key] !== undefined && existing[s.key] !== '' ? existing[s.key] : s.value;
    return [s.key, value, s.note];
  });
  sh.getRange(2, 1, rows.length, 3).setValues(rows);
  sh.getRange(2, 1, rows.length, 3).setVerticalAlignment('middle').setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);

  var rowOf = function (key) {
    for (var i = 0; i < DEFAULT_SETTINGS.length; i++) if (DEFAULT_SETTINGS[i].key === key) return i + 2;
    return 0;
  };
  var urlRow = rowOf('ウェブアプリURL');
  var tokenRow = rowOf('管理者トークン');
  var adminRow = rowOf('管理画面URL');
  var urlCell = 'B' + urlRow;
  var tokenCell = 'B' + tokenRow;

  if (adminRow) {
    sh.getRange(adminRow, 2).setFormula(
      '=IF(OR(' + urlCell + '="",' + tokenCell + '=""),"（ウェブアプリURLを入力すると自動生成されます）",' +
      urlCell + '&"?admin="&' + tokenCell + ')'
    );
  }

  var ss = ss_();
  var named = ss.getRangeByName(NAMED_RANGE_WEBAPP);
  if (named && named.getA1Notation() !== urlCell) { ss.removeNamedRange(NAMED_RANGE_WEBAPP); named = null; }
  if (!named) ss.setNamedRange(NAMED_RANGE_WEBAPP, sh.getRange(urlRow, 2));

  sh.getRange(2, 2, rows.length, 1).setBackground('#fdfaf2');
}

/** 数式列。列の位置は列定義から求めるので、項目を増やしても壊れません。 */
function buildFormulaColumns_() {
  var agency = sheet_(SHEETS.AGENCY);
  var tokenCol = colOf_(AGENCY_FIELDS, 'token');
  agency.getRange(2, fieldIndex_(AGENCY_FIELDS, 'mypageUrl') + 1).setFormula(
    '=ARRAYFORMULA(IF(' + tokenCol + '2:' + tokenCol + '="","",IF(' + NAMED_RANGE_WEBAPP + '="",' +
    '"（設定シートにウェブアプリURLを入力してください）",' + NAMED_RANGE_WEBAPP + '&"?a="&' + tokenCol + '2:' + tokenCol + ')))'
  );

  var referral = sheet_(SHEETS.REFERRAL);
  var c = function (key) { return colOf_(REFERRAL_FIELDS, key); };
  var range = function (key) { return c(key) + '2:' + c(key); };
  var need = [
    { key: 'company', label: ' 会社名' },
    { key: 'name',    label: ' 氏名' },
    { key: 'email',   label: ' メール' },
    { key: 'phone',   label: ' 電話' },
    { key: 'detail',  label: ' 詳細' }
  ];
  var allFilled = need.map(function (n) { return '(' + range(n.key) + '<>"")'; }).join('*');
  var missing = need.map(function (n) { return 'IF(' + range(n.key) + '="","' + n.label + '","")'; }).join('&');
  referral.getRange(2, fieldIndex_(REFERRAL_FIELDS, 'fillState') + 1).setFormula(
    '=ARRAYFORMULA(IF(' + range('id') + '="","",IF(' + allFilled + ',"◯ 完了","△ 未入力:"&' + missing + ')))'
  );

  var briefing = sheet_(SHEETS.BRIEFING);
  var bIdCol = colOf_(BRIEFING_FIELDS, 'id');
  briefing.getRange(2, fieldIndex_(BRIEFING_FIELDS, 'booked') + 1).setFormula(
    '=ARRAYFORMULA(IF(' + bIdCol + '2:' + bIdCol + '="","",COUNTIF(' +
    "'" + SHEETS.REFERRAL + "'!" + range('briefingId') + ',' + bIdCol + '2:' + bIdCol + ')))'
  );
}

function buildValidations_() {
  var settings = getSettings_();
  var sh = sheet_(SHEETS.REFERRAL);
  var rows = sh.getMaxRows() - 1;
  if (rows < 1) return;

  applyList_(sh, fieldIndex_(REFERRAL_FIELDS, 'kind') + 1, rows, [KIND_CUSTOMER, KIND_PARTNER]);
  applyList_(sh, fieldIndex_(REFERRAL_FIELDS, 'status') + 1, rows, optionList_(settings, 'ステータス選択肢', ['新規']));
  applyList_(sh, fieldIndex_(REFERRAL_FIELDS, 'lostReason') + 1, rows, optionList_(settings, '失注理由選択肢', ['その他']));
  applyList_(sh, fieldIndex_(REFERRAL_FIELDS, 'product') + 1, rows, optionList_(settings, '興味商材選択肢', ['未定']));
  applyList_(sh, fieldIndex_(REFERRAL_FIELDS, 'ownership') + 1, rows, OWNERSHIPS);
  applyList_(sh, fieldIndex_(REFERRAL_FIELDS, 'briefing') + 1, rows, BRIEFING_STATES);

  var ag = sheet_(SHEETS.AGENCY);
  applyList_(ag, fieldIndex_(AGENCY_FIELDS, 'active') + 1, ag.getMaxRows() - 1, ['有効', '停止']);

  var nt = sheet_(SHEETS.NOTICE);
  applyList_(nt, fieldIndex_(NOTICE_FIELDS, 'kind') + 1, nt.getMaxRows() - 1, ['最新LP', 'お知らせ', '資料']);
  applyCheckbox_(nt, fieldIndex_(NOTICE_FIELDS, 'published') + 1);

  var bf = sheet_(SHEETS.BRIEFING);
  applyList_(bf, fieldIndex_(BRIEFING_FIELDS, 'kind') + 1, bf.getMaxRows() - 1,
    ['代理店向け説明会', 'AI活用研修 説明会', 'AIバード 説明会']);
  applyCheckbox_(bf, fieldIndex_(BRIEFING_FIELDS, 'open') + 1);

  var tp = sheet_(SHEETS.TEMPLATE);
  applyList_(tp, fieldIndex_(TEMPLATE_FIELDS, 'target') + 1, tp.getMaxRows() - 1, ['お客様', '代理店候補']);
  applyList_(tp, fieldIndex_(TEMPLATE_FIELDS, 'channel') + 1, tp.getMaxRows() - 1, ['LINE', 'メール']);
  applyCheckbox_(tp, fieldIndex_(TEMPLATE_FIELDS, 'open') + 1);
}

function applyList_(sheet, col, rows, list) {
  if (!list || !list.length || rows < 1) return;
  sheet.getRange(2, col, rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(list, true).setAllowInvalid(true).build()
  );
}

function applyCheckbox_(sheet, col) {
  var rows = sheet.getMaxRows() - 1;
  if (rows < 1) return;
  sheet.getRange(2, col, rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireCheckbox().build()
  );
}

function buildConditionalFormats_() {
  var sh = sheet_(SHEETS.REFERRAL);
  var rows = Math.max(sh.getMaxRows() - 1, 1);
  var statusRange = sh.getRange(2, fieldIndex_(REFERRAL_FIELDS, 'status') + 1, rows, 1);
  var fillRange = sh.getRange(2, fieldIndex_(REFERRAL_FIELDS, 'fillState') + 1, rows, 1);
  var rules = [];

  Object.keys(STATUS_COLORS).forEach(function (status) {
    var c = STATUS_COLORS[status];
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(status).setBackground(c.bg).setFontColor(c.fg)
      .setRanges([statusRange]).build());
  });
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextStartsWith('△').setBackground('#fdf1de').setFontColor('#8a5a1e')
    .setRanges([fillRange]).build());
  sh.setConditionalFormatRules(rules);
}

/** ダッシュボード（すべて数式なので常に最新） */
function buildDashboard_() {
  var sh = ensureSheet_(SHEETS.DASHBOARD);
  sh.clear();
  sh.clearConditionalFormatRules();

  var R = "'" + SHEETS.REFERRAL + "'!";
  var A = "'" + SHEETS.AGENCY + "'!";
  var r = function (key) { var c = colOf_(REFERRAL_FIELDS, key); return R + c + '2:' + c; };
  var a = function (key) { var c = colOf_(AGENCY_FIELDS, key); return A + c + '2:' + c; };

  sh.getRange('A1').setValue('代理店ポータル ダッシュボード').setFontSize(16).setFontWeight('bold');
  sh.getRange('A2').setValue('※ すべて数式です。紹介シートが更新されると自動で変わります。').setFontColor('#6b665e');

  var summary = [
    ['全体サマリ', ''],
    ['総紹介数',       '=COUNTA(' + r('id') + ')'],
    ['顧客紹介',       '=COUNTIF(' + r('kind') + ',"' + KIND_CUSTOMER + '")'],
    ['代理店紹介',     '=COUNTIF(' + r('kind') + ',"' + KIND_PARTNER + '")'],
    ['新規',           '=COUNTIF(' + r('status') + ',"新規")'],
    ['アプローチ中',   '=COUNTIF(' + r('status') + ',"アプローチ中")'],
    ['商談中',         '=COUNTIF(' + r('status') + ',"商談中")'],
    ['稼働中',         '=COUNTIF(' + r('status') + ',"稼働中")'],
    ['保留',           '=COUNTIF(' + r('status') + ',"保留")'],
    ['失注',           '=COUNTIF(' + r('status') + ',"失注")'],
    ['情報が不足している件数', '=COUNTIF(' + r('fillState') + ',"△*")'],
    ['説明会 予約確定', '=COUNTIF(' + r('briefing') + ',"予約確定")'],
    ['今月の新規登録', '=COUNTIFS(' + r('createdAt') + ',">="&EOMONTH(TODAY(),-1)+1,' + r('createdAt') + ',"<"&EOMONTH(TODAY(),0)+1)'],
    ['稼働中の代理店数', '=COUNTA(FILTER(' + a('name') + ',' + a('active') + '="有効",' + a('name') + '<>""))']
  ];
  sh.getRange(4, 1, summary.length, 2).setValues(summary.map(function (x) { return [x[0], '']; }));
  for (var i = 1; i < summary.length; i++) sh.getRange(4 + i, 2).setFormula(summary[i][1]);
  sh.getRange(4, 1, 1, 2).setBackground('#2b2b28').setFontColor('#ffffff').setFontWeight('bold');
  sh.getRange(5, 2, summary.length - 1, 1).setHorizontalAlignment('right').setFontSize(12).setFontWeight('bold');
  sh.getRange(11, 1, 1, 2).setBackground('#e6efe7');

  var top = 4 + summary.length + 2;
  sh.getRange(top - 1, 1).setValue('代理店別の内訳').setFontWeight('bold').setFontSize(13);

  var statuses = ['新規', 'アプローチ中', '商談中', '稼働中', '保留', '失注', '取り下げ'];
  var headers = ['代理店名', '顧客紹介', '代理店紹介'].concat(statuses).concat(['情報不足', '合計']);
  sh.getRange(top, 1, 1, headers.length).setValues([headers])
    .setBackground('#2b2b28').setFontColor('#ffffff').setFontWeight('bold');
  sh.setFrozenRows(top);

  var first = top + 1;
  var names = 'A' + first + ':A';
  sh.getRange(first, 1).setFormula('=IFERROR(SORT(FILTER(' + a('name') + ',' + a('name') + '<>"")),"")');

  var counts = [
    { col: 2, extra: ',' + r('kind') + ',"' + KIND_CUSTOMER + '"' },
    { col: 3, extra: ',' + r('kind') + ',"' + KIND_PARTNER + '"' }
  ];
  statuses.forEach(function (st, idx) {
    counts.push({ col: 4 + idx, extra: ',' + r('status') + ',"' + st + '"' });
  });
  counts.push({ col: 4 + statuses.length, extra: ',' + r('fillState') + ',"△*"' });
  counts.forEach(function (c) {
    sh.getRange(first, c.col).setFormula(
      '=ARRAYFORMULA(IF(' + names + '="","",COUNTIFS(' + r('agencyName') + ',' + names + c.extra + ')))'
    );
  });
  sh.getRange(first, headers.length).setFormula(
    '=ARRAYFORMULA(IF(' + names + '="","",COUNTIF(' + r('agencyName') + ',' + names + ')))'
  );

  sh.setColumnWidth(1, 220);
  for (var c2 = 2; c2 <= headers.length; c2++) sh.setColumnWidth(c2, 96);

  var rows = Math.max(sh.getMaxRows() - first, 1);
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThan(0).setBackground('#e6efe7').setFontColor('#2f5d3f')
      .setRanges([sh.getRange(first, 7, rows, 1)]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThan(0).setBackground('#fdf1de').setFontColor('#8a5a1e')
      .setRanges([sh.getRange(first, 4 + statuses.length, rows, 1)]).build()
  ]);
}

/** 文面テンプレートが空のときだけ、たたき台を入れる */
function seedTemplates_() {
  if (readAll_(SHEETS.TEMPLATE, TEMPLATE_FIELDS).length > 0) return;
  DEFAULT_TEMPLATES.forEach(function (t) {
    var seed = {};
    Object.keys(t).forEach(function (k) { seed[k] = t[k]; });
    seed.open = true;                       // 初期テンプレートは公開状態で入れる
    saveTemplate_(seed);
  });
}

function reorderSheets_() {
  var ss = ss_();
  var order = [SHEETS.DASHBOARD, SHEETS.REFERRAL, SHEETS.AGENCY, SHEETS.NOTICE,
               SHEETS.BRIEFING, SHEETS.TEMPLATE, SHEETS.SETTING, SHEETS.LOG];
  for (var i = 0; i < order.length; i++) {
    var sh = ss.getSheetByName(order[i]);
    if (sh) { ss.setActiveSheet(sh); ss.moveActiveSheet(i + 1); }
  }
  var dash = ss.getSheetByName(SHEETS.DASHBOARD);
  if (dash) ss.setActiveSheet(dash);
}

/* ------------------------------------------------------------------ */
/* メニューから呼ぶ便利機能                                             */
/* ------------------------------------------------------------------ */

function showUrls() {
  var settings = getSettings_();
  var base = settings['ウェブアプリURL'];
  var ui = SpreadsheetApp.getUi();
  if (!base) {
    ui.alert('先に［設定］シートの「ウェブアプリURL」に、デプロイしたウェブアプリのURL（末尾 /exec）を貼り付けてください。');
    return;
  }
  var lines = ['■ 管理画面（社内限定・絶対に外部へ共有しない）', base + '?admin=' + settings['管理者トークン'], '', '■ 代理店マイページ'];
  listAgencies_().forEach(function (a) {
    lines.push('・' + a.name + '（' + a.id + '）' + (a.active === '停止' ? ' ※停止中' : ''));
    lines.push('   ' + base + '?a=' + a.token);
  });
  ui.alert('URL一覧', lines.join('\n'), ui.ButtonSet.OK);
}

function promptAddAgency() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.prompt('代理店を追加', '代理店名を入力してください', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var name = res.getResponseText().trim();
  if (!name) return;
  var agency = createAgency_({ name: name });
  var base = getSettings_()['ウェブアプリURL'];
  ui.alert('追加しました',
    agency.name + '（' + agency.id + '）\n基本マージン率は ' + agency.rate + '% で登録しました（代理店マスタで変更できます）。\n\nマイページURL:\n' +
    (base ? base + '?a=' + agency.token : '（設定シートにウェブアプリURLを入力すると生成されます）'),
    ui.ButtonSet.OK);
}

function promptAddBriefing() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.prompt('説明会の日程を追加',
    '開催日時を入力してください（例：2026/09/03 15:00）', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var startAt = res.getResponseText().trim();
  if (!startAt) return;
  var b = saveBriefing_({ startAt: startAt, kind: '代理店向け説明会', open: true });
  ui.alert('追加しました', b.id + '　' + b.startAt + '\n\n対象や参加URLは［説明会日程］シートで編集できます。', ui.ButtonSet.OK);
}

function regenerateAdminToken() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.alert('管理者トークンを再発行すると、いまの管理画面URLは使えなくなります。よろしいですか？', ui.ButtonSet.YES_NO);
  if (res !== ui.Button.YES) return;
  var token = newToken_();
  setSetting_('管理者トークン', token);
  var base = getSettings_()['ウェブアプリURL'];
  ui.alert('新しい管理画面URL', base ? base + '?admin=' + token : token, ui.ButtonSet.OK);
}
