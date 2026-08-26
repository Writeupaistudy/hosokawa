/**
 * Setup.gs — スプレッドシートの初期構築とメニュー
 *
 * 何度実行しても壊れません（不足しているものだけ作り直します）。
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('代理店ポータル')
    .addItem('初期セットアップ／再点検', 'setupSpreadsheet')
    .addSeparator()
    .addItem('URL一覧を表示', 'showUrls')
    .addItem('代理店を追加', 'promptAddAgency')
    .addSeparator()
    .addItem('管理者トークンを再発行', 'regenerateAdminToken')
    .addToUi();
}

/** メインのセットアップ処理 */
function setupSpreadsheet() {
  buildSettingSheet_();   // 設定シートは独自レイアウト（キー／値／説明）

  buildSheet_(SHEETS.AGENCY, AGENCY_FIELDS, '#1a56c4');
  buildSheet_(SHEETS.REFERRAL, REFERRAL_FIELDS, '#137a3d');
  buildSheet_(SHEETS.NOTICE, NOTICE_FIELDS, '#a55a00');
  buildSheet_(SHEETS.LOG, LOG_FIELDS, '#5a616b');

  buildFormulaColumns_();
  buildValidations_();
  buildConditionalFormats_();
  buildDashboard_();

  // 管理者トークンが未発行なら発行
  var settings = getSettings_();
  if (!settings['管理者トークン']) setSetting_('管理者トークン', newToken_());

  reorderSheets_();
  SpreadsheetApp.getActive().toast('セットアップが完了しました。', '代理店ポータル', 5);
}

/* ------------------------------------------------------------------ */

function ensureSheet_(name) {
  var ss = ss_();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

/** 見出し行・書式・列幅を整える（既存データは消しません） */
function buildSheet_(name, fields, headerColor) {
  var sh = ensureSheet_(name);
  var headers = headersOf_(fields);

  if (sh.getMaxColumns() < headers.length) {
    sh.insertColumnsAfter(sh.getMaxColumns(), headers.length - sh.getMaxColumns());
  }
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  sh.getRange(1, 1, 1, headers.length)
    .setBackground(headerColor)
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setVerticalAlignment('middle');
  sh.setRowHeight(1, 34);
  sh.setFrozenRows(1);
  if (name === SHEETS.REFERRAL || name === SHEETS.AGENCY) sh.setFrozenColumns(1);

  for (var i = 0; i < fields.length; i++) {
    sh.setColumnWidth(i + 1, fields[i].w || 140);
  }
  var maxRows = sh.getMaxRows();
  if (maxRows > 1) {
    sh.getRange(2, 1, maxRows - 1, headers.length).setVerticalAlignment('top').setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
  }
}

/** 設定シートは キー / 値 / 説明 の3列 */
function buildSettingSheet_() {
  var sh = ensureSheet_(SHEETS.SETTING);
  var existing = getSettings_();

  sh.getRange(1, 1, 1, 3).setValues([['設定キー', '値', '説明']])
    .setBackground('#333a44').setFontColor('#ffffff').setFontWeight('bold');
  sh.setFrozenRows(1);
  sh.setColumnWidth(1, 220);
  sh.setColumnWidth(2, 460);
  sh.setColumnWidth(3, 520);

  var rows = DEFAULT_SETTINGS.map(function (s) {
    var value = existing[s.key] !== undefined && existing[s.key] !== '' ? existing[s.key] : s.value;
    return [s.key, value, s.note];
  });
  sh.getRange(2, 1, rows.length, 3).setValues(rows);
  sh.getRange(2, 1, rows.length, 3).setVerticalAlignment('middle').setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);

  // 行番号は DEFAULT_SETTINGS の並び順から求める（並びを変えても壊れないように）
  var rowOf = function (key) {
    for (var i = 0; i < DEFAULT_SETTINGS.length; i++) if (DEFAULT_SETTINGS[i].key === key) return i + 2;
    return 0;
  };
  var urlRow = rowOf('ウェブアプリURL');
  var tokenRow = rowOf('管理者トークン');
  var adminRow = rowOf('管理画面URL');
  var urlCell = 'B' + urlRow;
  var tokenCell = 'B' + tokenRow;

  // 管理画面URL は自動計算
  if (adminRow) {
    sh.getRange(adminRow, 2).setFormula(
      '=IF(OR(' + urlCell + '="",' + tokenCell + '=""),"（ウェブアプリURLを入力すると自動生成されます）",' +
      urlCell + '&"?admin="&' + tokenCell + ')'
    );
  }

  // 名前付き範囲（代理店マスタのマイページURL自動生成で使う）。位置がズレていたら貼り直す。
  var ss = ss_();
  var named = ss.getRangeByName(NAMED_RANGE_WEBAPP);
  if (named && named.getA1Notation() !== urlCell) { ss.removeNamedRange(NAMED_RANGE_WEBAPP); named = null; }
  if (!named) ss.setNamedRange(NAMED_RANGE_WEBAPP, sh.getRange(urlRow, 2));

  sh.getRange(2, 2, rows.length, 1).setBackground('#fffbe6');
}

/** 数式列（マイページURL・情報の充足）をセットする */
function buildFormulaColumns_() {
  var agency = sheet_(SHEETS.AGENCY);
  var mypageCol = fieldIndex_(AGENCY_FIELDS, 'mypageUrl') + 1;
  agency.getRange(2, mypageCol).setFormula(
    '=ARRAYFORMULA(IF(B2:B="","",IF(' + NAMED_RANGE_WEBAPP + '="","（設定シートにウェブアプリURLを入力してください）",' + NAMED_RANGE_WEBAPP + '&"?a="&B2:B)))'
  );

  var referral = sheet_(SHEETS.REFERRAL);
  var fillCol = fieldIndex_(REFERRAL_FIELDS, 'fillState') + 1;
  referral.getRange(2, fillCol).setFormula(
    '=ARRAYFORMULA(IF(A2:A="","",' +
    'IF((G2:G<>"")*(H2:H<>"")*(I2:I<>"")*(J2:J<>"")*(K2:K<>""),"◯ 完了",' +
    '"△ 未入力:"&IF(G2:G=""," 会社名","")&IF(H2:H=""," 氏名","")&IF(I2:I=""," メール","")&IF(J2:J=""," 電話","")&IF(K2:K=""," 詳細",""))))'
  );
}

function buildValidations_() {
  var settings = getSettings_();
  var sh = sheet_(SHEETS.REFERRAL);
  var maxRows = sh.getMaxRows() - 1;
  if (maxRows < 1) return;

  applyList_(sh, fieldIndex_(REFERRAL_FIELDS, 'kind') + 1, maxRows, [KIND_CUSTOMER, KIND_PARTNER]);
  applyList_(sh, fieldIndex_(REFERRAL_FIELDS, 'status') + 1, maxRows,
    optionList_(settings, 'ステータス選択肢', ['新規']));
  applyList_(sh, fieldIndex_(REFERRAL_FIELDS, 'lostReason') + 1, maxRows,
    optionList_(settings, '失注理由選択肢', ['その他']));
  applyList_(sh, fieldIndex_(REFERRAL_FIELDS, 'product') + 1, maxRows,
    optionList_(settings, '興味商材選択肢', ['未定']));

  var ag = sheet_(SHEETS.AGENCY);
  applyList_(ag, fieldIndex_(AGENCY_FIELDS, 'active') + 1, ag.getMaxRows() - 1, ['有効', '停止']);

  var nt = sheet_(SHEETS.NOTICE);
  applyList_(nt, fieldIndex_(NOTICE_FIELDS, 'kind') + 1, nt.getMaxRows() - 1, ['最新LP', 'お知らせ', '資料']);
  var pubCol = fieldIndex_(NOTICE_FIELDS, 'published') + 1;
  nt.getRange(2, pubCol, nt.getMaxRows() - 1, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
}

function applyList_(sheet, col, rows, list) {
  if (!list || !list.length || rows < 1) return;
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(list, true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(2, col, rows, 1).setDataValidation(rule);
}

function buildConditionalFormats_() {
  var sh = sheet_(SHEETS.REFERRAL);
  var statusCol = fieldIndex_(REFERRAL_FIELDS, 'status') + 1;
  var fillCol = fieldIndex_(REFERRAL_FIELDS, 'fillState') + 1;
  var rows = Math.max(sh.getMaxRows() - 1, 1);
  var rules = [];

  Object.keys(STATUS_COLORS).forEach(function (status) {
    var c = STATUS_COLORS[status];
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(status)
      .setBackground(c.bg)
      .setFontColor(c.fg)
      .setRanges([sh.getRange(2, statusCol, rows, 1)])
      .build());
  });

  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextStartsWith('△')
    .setBackground('#fff4e0')
    .setFontColor('#a55a00')
    .setRanges([sh.getRange(2, fillCol, rows, 1)])
    .build());

  sh.setConditionalFormatRules(rules);
}

/** ダッシュボード（全部数式なので常に最新） */
function buildDashboard_() {
  var sh = ensureSheet_(SHEETS.DASHBOARD);
  sh.clear();
  sh.clearConditionalFormatRules();

  var R = "'" + SHEETS.REFERRAL + "'";
  var A = "'" + SHEETS.AGENCY + "'";

  sh.getRange('A1').setValue('代理店ポータル ダッシュボード').setFontSize(16).setFontWeight('bold');
  sh.getRange('A2').setValue('※ すべて数式です。紹介シートが更新されると自動で変わります。').setFontColor('#5a616b');

  var summary = [
    ['全体サマリ', ''],
    ['総紹介数',       '=COUNTA(' + R + '!A2:A)'],
    ['顧客紹介',       '=COUNTIF(' + R + '!F2:F,"' + KIND_CUSTOMER + '")'],
    ['代理店紹介',     '=COUNTIF(' + R + '!F2:F,"' + KIND_PARTNER + '")'],
    ['新規',           '=COUNTIF(' + R + '!M2:M,"新規")'],
    ['アプローチ中',   '=COUNTIF(' + R + '!M2:M,"アプローチ中")'],
    ['商談中',         '=COUNTIF(' + R + '!M2:M,"商談中")'],
    ['稼働中',         '=COUNTIF(' + R + '!M2:M,"稼働中")'],
    ['保留',           '=COUNTIF(' + R + '!M2:M,"保留")'],
    ['失注',           '=COUNTIF(' + R + '!M2:M,"失注")'],
    ['情報が不足している件数', '=COUNTIF(' + R + '!R2:R,"△*")'],
    ['今月の新規登録', '=COUNTIFS(' + R + '!B2:B,">="&EOMONTH(TODAY(),-1)+1,' + R + '!B2:B,"<"&EOMONTH(TODAY(),0)+1)'],
    ['稼働中の代理店数', '=COUNTA(FILTER(' + A + '!C2:C,' + A + '!I2:I="有効",' + A + '!C2:C<>""))']
  ];
  sh.getRange(4, 1, summary.length, 2).setValues(summary.map(function (r) { return [r[0], '']; }));
  for (var i = 1; i < summary.length; i++) {
    sh.getRange(4 + i, 2).setFormula(summary[i][1]);
  }
  sh.getRange(4, 1, 1, 2).setBackground('#333a44').setFontColor('#ffffff').setFontWeight('bold');
  sh.getRange(5, 2, summary.length - 1, 1).setHorizontalAlignment('right').setFontSize(12).setFontWeight('bold');
  sh.getRange(11, 1, 1, 2).setBackground('#e3f6e9');  // 稼働中の行を強調

  var top = 4 + summary.length + 2;
  sh.getRange(top - 1, 1).setValue('代理店別の内訳').setFontWeight('bold').setFontSize(13);

  var headers = ['代理店名', '顧客紹介', '代理店紹介', '新規', 'アプローチ中', '商談中', '稼働中', '保留', '失注', '取り下げ', '情報不足', '合計'];
  sh.getRange(top, 1, 1, headers.length).setValues([headers])
    .setBackground('#333a44').setFontColor('#ffffff').setFontWeight('bold');
  sh.setFrozenRows(top);

  var firstRow = top + 1;
  var nameRange = 'A' + firstRow + ':A';
  sh.getRange(firstRow, 1).setFormula('=IFERROR(SORT(FILTER(' + A + '!C2:C,' + A + '!C2:C<>"")),"")');

  var byKind = [
    { col: 2, criteria: '' + R + '!F2:F,"' + KIND_CUSTOMER + '"' },
    { col: 3, criteria: '' + R + '!F2:F,"' + KIND_PARTNER + '"' }
  ];
  byKind.forEach(function (c) {
    sh.getRange(firstRow, c.col).setFormula(
      '=ARRAYFORMULA(IF(' + nameRange + '="","",COUNTIFS(' + R + '!E2:E,' + nameRange + ',' + c.criteria + ')))'
    );
  });

  var statuses = ['新規', 'アプローチ中', '商談中', '稼働中', '保留', '失注', '取り下げ'];
  statuses.forEach(function (st, idx) {
    sh.getRange(firstRow, 4 + idx).setFormula(
      '=ARRAYFORMULA(IF(' + nameRange + '="","",COUNTIFS(' + R + '!E2:E,' + nameRange + ',' + R + '!M2:M,"' + st + '")))'
    );
  });

  sh.getRange(firstRow, 11).setFormula(
    '=ARRAYFORMULA(IF(' + nameRange + '="","",COUNTIFS(' + R + '!E2:E,' + nameRange + ',' + R + '!R2:R,"△*")))'
  );
  sh.getRange(firstRow, 12).setFormula(
    '=ARRAYFORMULA(IF(' + nameRange + '="","",COUNTIF(' + R + '!E2:E,' + nameRange + ')))'
  );

  sh.setColumnWidth(1, 220);
  for (var c2 = 2; c2 <= headers.length; c2++) sh.setColumnWidth(c2, 96);

  var gradeRange = sh.getRange(firstRow, 7, Math.max(sh.getMaxRows() - firstRow, 1), 1);
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThan(0).setBackground('#e3f6e9').setFontColor('#137a3d')
      .setRanges([gradeRange]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThan(0).setBackground('#fff4e0').setFontColor('#a55a00')
      .setRanges([sh.getRange(firstRow, 11, Math.max(sh.getMaxRows() - firstRow, 1), 1)]).build()
  ]);
}

function reorderSheets_() {
  var ss = ss_();
  var order = [SHEETS.DASHBOARD, SHEETS.REFERRAL, SHEETS.AGENCY, SHEETS.NOTICE, SHEETS.SETTING, SHEETS.LOG];
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
    agency.name + '（' + agency.id + '）\n\nマイページURL:\n' + (base ? base + '?a=' + agency.token : '（設定シートにウェブアプリURLを入力すると生成されます）'),
    ui.ButtonSet.OK);
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
