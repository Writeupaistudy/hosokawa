/**
 * Code.gs — ウェブアプリの入口（doGet）と、画面から呼ばれるAPI
 *
 * URL の形:
 *   代理店マイページ … https://script.google.com/macros/s/xxx/exec?a=<アクセストークン>
 *   管理画面         … https://script.google.com/macros/s/xxx/exec?admin=<管理者トークン>
 */

function doGet(e) {
  var p = (e && e.parameter) || {};

  try {
    if (p.admin) return renderAdmin_(String(p.admin).trim());
    if (p.a)     return renderAgency_(String(p.a).trim());
    return renderMessage_('URLが正しくありません',
      'このページを開くには、弊社からお渡しした専用URLをご利用ください。');
  } catch (err) {
    return renderMessage_('エラーが発生しました', String(err && err.message ? err.message : err));
  }
}

/** HTMLに埋め込むためのJSON。</script> でページが壊れないよう < をエスケープする */
function jsonForHtml_(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function page_(template, title) {
  return template.evaluate()
    .setTitle(title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function renderMessage_(title, message) {
  var t = HtmlService.createTemplateFromFile('Message');
  t.title = title;
  t.message = message;
  return page_(t, title);
}

/* ------------------------------------------------------------------ */
/* 画面の描画                                                           */
/* ------------------------------------------------------------------ */

function renderAgency_(token) {
  var agency = findAgencyByToken_(token);
  if (!agency) {
    return renderMessage_('ページが見つかりません',
      'URLが古いか、無効になっている可能性があります。お手数ですが弊社担当までご連絡ください。');
  }
  if (agency.active === '停止') {
    return renderMessage_('現在ご利用いただけません',
      'このページは一時的に停止しています。弊社担当までご連絡ください。');
  }
  var t = HtmlService.createTemplateFromFile('Agency');
  t.boot = jsonForHtml_(agencyBoard_(agency));
  return page_(t, agency.name + ' 様 専用ページ');
}

function renderAdmin_(token) {
  var settings = getSettings_();
  var expected = String(settings['管理者トークン'] || '').trim();
  if (!expected || token !== expected) {
    return renderMessage_('アクセスできません', '管理画面のURLが正しくありません。');
  }
  var t = HtmlService.createTemplateFromFile('Admin');
  t.boot = jsonForHtml_(adminBoard_(token));
  return page_(t, '代理店ポータル 管理画面');
}

/* ------------------------------------------------------------------ */
/* データ整形                                                           */
/* ------------------------------------------------------------------ */

/** 代理店に見せてよい項目だけに絞る（弊社メモ・次回アクション日は渡さない） */
function publicReferral_(r) {
  return {
    id: r.id,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    kind: r.kind,
    company: r.company,
    name: r.name,
    email: r.email,
    phone: r.phone,
    detail: r.detail,
    product: r.product,
    status: r.status,
    lostReason: r.lostReason,
    updatedBy: r.updatedBy
  };
}

function optionsPayload_(settings) {
  return {
    statuses: optionList_(settings, 'ステータス選択肢', ['新規', 'アプローチ中', '商談中', '稼働中', '保留', '失注', '取り下げ']),
    lostReasons: optionList_(settings, '失注理由選択肢', ['その他']),
    products: optionList_(settings, '興味商材選択肢', ['AIバード', 'AI活用研修', '両方', '未定']),
    kinds: [KIND_CUSTOMER, KIND_PARTNER],
    requiredKeys: REQUIRED_KEYS,
    requiredLabels: REQUIRED_LABELS,
    statusColors: STATUS_COLORS
  };
}

function agencyBoard_(agency) {
  var settings = getSettings_();
  return {
    agency: {
      id: agency.id,
      name: agency.name,
      contact: agency.contact,
      lpUrl: agency.lpUrl,
      lpNote: agency.lpNote,
      token: agency.token
    },
    company: settings['会社名'] || '弊社',
    intro: settings['代理店ページの案内文'] || '',
    canEditStatus: String(settings['代理店によるステータス編集'] || '許可') === '許可',
    options: optionsPayload_(settings),
    notices: noticesForAgency_(agency.id),
    referrals: listReferralsByAgency_(agency.id).map(publicReferral_)
  };
}

function adminBoard_(token) {
  var settings = getSettings_();
  var agencies = listAgencies_();
  var base = String(settings['ウェブアプリURL'] || '').trim();
  return {
    token: token,
    company: settings['会社名'] || '弊社',
    webAppUrl: base,
    sheetUrl: ss_().getUrl(),
    options: optionsPayload_(settings),
    agencies: agencies.map(function (a) {
      return {
        id: a.id, name: a.name, contact: a.contact, email: a.email, phone: a.phone,
        lpUrl: a.lpUrl, lpNote: a.lpNote, active: a.active, createdAt: a.createdAt, memo: a.memo,
        mypageUrl: base ? base + '?a=' + a.token : ''
      };
    }),
    notices: listNotices_().map(function (n) {
      return {
        id: n.id, order: n.order, kind: n.kind, title: n.title, body: n.body,
        url: n.url, btnLabel: n.btnLabel, target: n.target,
        published: String(n.published).toUpperCase() === 'TRUE', updatedAt: n.updatedAt
      };
    }),
    referrals: listReferrals_().map(function (r) {
      return {
        id: r.id, createdAt: r.createdAt, updatedAt: r.updatedAt,
        agencyId: r.agencyId, agencyName: r.agencyName, kind: r.kind,
        company: r.company, name: r.name, email: r.email, phone: r.phone,
        detail: r.detail, product: r.product, status: r.status,
        lostReason: r.lostReason, nextAction: r.nextAction, memo: r.memo,
        updatedBy: r.updatedBy
      };
    })
  };
}

/* ------------------------------------------------------------------ */
/* 代理店マイページから呼ばれるAPI                                      */
/* ------------------------------------------------------------------ */

var AGENCY_EDITABLE = ['kind', 'company', 'name', 'email', 'phone', 'detail', 'product'];
var ADMIN_EDITABLE = ['kind', 'company', 'name', 'email', 'phone', 'detail', 'product',
                      'status', 'lostReason', 'nextAction', 'memo'];

function requireAgency_(token) {
  var agency = findAgencyByToken_(token);
  if (!agency) throw new Error('セッションが無効です。ページを再読み込みしてください。');
  if (agency.active === '停止') throw new Error('このページは現在ご利用いただけません。');
  return agency;
}

function requireAdmin_(token) {
  var expected = String(getSettings_()['管理者トークン'] || '').trim();
  if (!expected || String(token).trim() !== expected) throw new Error('権限がありません。');
  return true;
}

/** 最新状態を取り直す（引っぱって更新／他端末の変更の反映） */
function apiAgencyRefresh(token) {
  return agencyBoard_(requireAgency_(token));
}

function apiAgencyCreateReferral(token, payload) {
  var agency = requireAgency_(token);
  createReferral_(agency, payload || {}, agency.name);
  return agencyBoard_(agency);
}

function apiAgencyUpdateReferral(token, referralId, payload) {
  var agency = requireAgency_(token);
  var target = findReferralById_(referralId);
  if (!target || String(target.agencyId).trim() !== String(agency.id).trim()) {
    throw new Error('この紹介は編集できません。');
  }
  var keys = AGENCY_EDITABLE.slice();
  var settings = getSettings_();
  if (String(settings['代理店によるステータス編集'] || '許可') === '許可') {
    keys.push('status');
    keys.push('lostReason');
  }
  updateReferral_(referralId, payload || {}, keys, agency.name);
  return agencyBoard_(agency);
}

/* ------------------------------------------------------------------ */
/* 管理画面から呼ばれるAPI                                              */
/* ------------------------------------------------------------------ */

function apiAdminRefresh(token) {
  requireAdmin_(token);
  return adminBoard_(token);
}

function apiAdminUpdateReferral(token, referralId, payload) {
  requireAdmin_(token);
  updateReferral_(referralId, payload || {}, ADMIN_EDITABLE, '弊社');
  return adminBoard_(token);
}

function apiAdminCreateReferral(token, agencyId, payload) {
  requireAdmin_(token);
  var agency = findAgencyById_(agencyId);
  if (!agency) throw new Error('代理店を選択してください。');
  createReferral_(agency, payload || {}, '弊社');
  return adminBoard_(token);
}

function apiAdminSaveAgency(token, payload) {
  requireAdmin_(token);
  if (payload && payload.id) updateAgency_(payload);
  else createAgency_(payload || {});
  return adminBoard_(token);
}

function apiAdminRotateAgencyToken(token, agencyId) {
  requireAdmin_(token);
  rotateAgencyToken_(agencyId);
  return adminBoard_(token);
}

function apiAdminSaveNotice(token, payload) {
  requireAdmin_(token);
  saveNotice_(payload || {});
  return adminBoard_(token);
}
