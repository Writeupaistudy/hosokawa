require('./gas-mock.cjs');
const fs = require('fs');
// GAS は全 .gs ファイルを1つのグローバルスコープに読み込む。それを再現するため連結して1回で評価する。
const dir = require('path').join(__dirname, '..', 'src');
const src = ['Config','Store','Setup','Code','Copy'].map(f => fs.readFileSync(dir + '/' + f + '.gs', 'utf8')).join('\n')
  // トップレベルの const は eval では共有されないので、テストから見えるよう global に載せ替える
  .replace(/^const (\w+) =/gm, 'globalThis.$1 =');
(0, eval)(src);

let pass = 0, fail = 0;
function ok(cond, label, extra){
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : '')); }
}
function head(t){ console.log('\n── ' + t); }

head('1. 初期セットアップ');
setupSpreadsheet();
['代理店マスタ','紹介','お知らせ・LP','変更履歴','ダッシュボード','設定'].forEach(n =>
  ok(!!SpreadsheetApp.getActive().getSheetByName(n), 'シート「' + n + '」が作られる'));
const st0 = getSettings_();
ok(!!st0['管理者トークン'], '管理者トークンが自動発行される', st0['管理者トークン']);
ok(st0['ステータス選択肢'].indexOf('稼働中') >= 0, 'ステータス選択肢が入っている');
setupSpreadsheet();  // 二度目
ok(getSettings_()['管理者トークン'] === st0['管理者トークン'], '再実行しても管理者トークンは維持される');

head('2. 数式列は上書きされない');
const refSheet = sheet_('紹介');
const fillCol = fieldIndex_(REFERRAL_FIELDS, 'fillState') + 1;
const fillFormula = refSheet.getRange(2, fillCol).getValues()[0][0];
ok(String(fillFormula).indexOf('=ARRAYFORMULA') === 0, '「情報の充足」列に数式が入る', fillFormula);
ok(writableWidth_(REFERRAL_FIELDS) === REFERRAL_FIELDS.length - 1, 'スクリプトは数式列の手前までしか書かない');
ok(writableWidth_(AGENCY_FIELDS) === AGENCY_FIELDS.length - 1, '代理店マスタも同様');

head('3. 代理店の登録');
setSetting_('ウェブアプリURL', 'https://script.google.com/macros/s/DUMMY/exec');
const a1 = createAgency_({ name: '株式会社アルファ', contact: '田中', email: 't@alpha.jp' });
const a2 = createAgency_({ name: 'ベータ商事', lpUrl: 'https://example.com/lp?ref=AG-002' });
ok(a1.id === 'AG-001' && a2.id === 'AG-002', '代理店IDが連番になる', [a1.id, a2.id]);
ok(a1.token !== a2.token && a1.token.length === 24, 'トークンが代理店ごとに発行される');
ok(findAgencyByToken_(a1.token).name === '株式会社アルファ', 'トークンから代理店を引ける');
ok(findAgencyByToken_('でたらめ') === null, '不正トークンは null');

head('4. 紹介の登録（代理店から）');
const r1 = createReferral_(a1, { kind:'顧客紹介', company:'カスタマー株式会社', name:'佐藤 一郎',
  email:'sato@customer.jp', phone:'090-1111-2222', detail:'AI研修に興味あり', product:'AI活用研修' }, a1.name);
const r2 = createReferral_(a1, { kind:'代理店紹介', name:'鈴木 二郎' }, a1.name);
const r3 = createReferral_(a2, { kind:'顧客紹介', name:'高橋 三郎', company:'ガンマ' }, a2.name);
ok(/^R-\d{8}-[0-9A-F]{6}$/.test(r1.id), '紹介IDが採番される', r1.id);
ok(r1.status === '新規', '初期ステータスは新規');
ok(r2.product === '', '代理店紹介では興味商材を持たない');
ok(listReferrals_().length === 3, '紹介が3件たまる');
ok(listReferralsByAgency_(a1.id).length === 2, '代理店ごとに絞り込める');
let threw = false;
try { createReferral_(a1, { name:'' }, a1.name); } catch(e){ threw = true; }
ok(threw, '氏名が空なら登録できない');

head('5. 情報の充足（伝えきっているかの判定）');
const board1 = agencyBoard_(findAgencyById_(a1.id));
const miss = k => {
  const r = board1.referrals.filter(x => x.id === k)[0];
  return REQUIRED_KEYS.filter(f => !String(r[f] || '').trim()).map(f => REQUIRED_LABELS[f]);
};
ok(miss(r1.id).length === 0, '全部埋まっている紹介は「不足なし」');
ok(miss(r2.id).join('・') === '会社名・メール・電話・詳細', '足りない項目が列挙される', miss(r2.id));

head('6. 代理店からの編集');
apiAgencyUpdateReferral(a1.token, r2.id, { company:'デルタ工業', email:'suzuki@delta.jp', phone:'080-3333-4444', detail:'代理店に興味' });
const r2b = findReferralById_(r2.id);
ok(r2b.company === 'デルタ工業' && r2b.phone === '080-3333-4444', '代理店の修正がスプシに反映される');
ok(r2b.updatedBy === a1.name, '最終更新者が記録される');
ok(listReferrals_().length === 3, '更新で行が増えない（上書きされている）');
let denied = false;
try { apiAgencyUpdateReferral(a1.token, r3.id, { name:'乗っ取り' }); } catch(e){ denied = true; }
ok(denied, '他社の紹介は編集できない');
apiAgencyUpdateReferral(a1.token, r2.id, { memo:'代理店が書いたメモ' });
ok(!findReferralById_(r2.id).memo, '代理店は弊社メモを書き換えられない');
ok(agencyBoard_(a1).referrals[0].memo === undefined, '代理店へ弊社メモを送らない');

head('7. 弊社（管理画面）からの更新');
const adminToken = getSettings_()['管理者トークン'];
apiAdminUpdateReferral(adminToken, r1.id, { status:'稼働中', memo:'初回商談済み', nextAction:'2026-09-01' });
const r1b = findReferralById_(r1.id);
ok(r1b.status === '稼働中' && r1b.memo === '初回商談済み', '弊社はステータスと社内メモを更新できる');
apiAdminUpdateReferral(adminToken, r3.id, { status:'失注', lostReason:'音信不通' });
ok(findReferralById_(r3.id).lostReason === '音信不通', '失注理由が入る');
apiAdminUpdateReferral(adminToken, r3.id, { status:'アプローチ中' });
ok(findReferralById_(r3.id).lostReason === '', '失注を解除すると理由がクリアされる');
let badAdmin = false;
try { apiAdminRefresh('にせトークン'); } catch(e){ badAdmin = true; }
ok(badAdmin, '管理者トークンが違えば拒否される');

head('8. ステータス編集の可否設定');
setSetting_('代理店によるステータス編集', '不可');
apiAgencyUpdateReferral(a1.token, r1.id, { status:'失注' });
ok(findReferralById_(r1.id).status === '稼働中', '「不可」なら代理店はステータスを変えられない');
setSetting_('代理店によるステータス編集', '許可');
apiAgencyUpdateReferral(a1.token, r1.id, { status:'保留' });
ok(findReferralById_(r1.id).status === '保留', '「許可」なら代理店も変えられる');

head('9. 変更履歴（追記専用の台帳）');
const logs = readAll_(SHEETS.LOG, LOG_FIELDS);
ok(logs.length >= 8, '登録・更新のたびに履歴が積み上がる（' + logs.length + '件）');
ok(logs.filter(l => l.action === '新規').length === 3, '新規登録が3件記録されている');
ok(logs.filter(l => l.action === 'ステータス変更').length >= 3, 'ステータス変更も記録される');
const snap = JSON.parse(logs[0].snapshot);
ok(snap['氏名'] === '佐藤 一郎' && snap['メールアドレス'] === 'sato@customer.jp',
   '履歴のスナップショットから元データを復元できる');
ok(findReferralById_(r1.id)._row === 2, '1件目は2行目に入る（数式列があってもズレない）', findReferralById_(r1.id)._row);
// 紹介シートの行を消しても履歴は残る
const victim = findReferralById_(r1.id)._row;
sheet_(SHEETS.REFERRAL).data[victim - 1] = [];
ok(listReferrals_().length === 2, '行を消すと紹介シートからは消える', listReferrals_().length);
ok(readAll_(SHEETS.LOG, LOG_FIELDS).length === logs.length, 'それでも変更履歴は失われない');
const restored = JSON.parse(readAll_(SHEETS.LOG, LOG_FIELDS).filter(l => l.referralId === r1.id)[0].snapshot);
ok(restored['氏名'] === '佐藤 一郎', '消えた行を履歴から復元できる');

head('10. 代理店名の変更が紹介側にも波及');
updateAgency_({ id: a1.id, name: 'アルファ株式会社' });
ok(listReferralsByAgency_(a1.id).every(r => r.agencyName === 'アルファ株式会社'), '既存の紹介の代理店名も更新される');

head('11. お知らせ・LP の出し分け');
saveNotice_({ title:'最新のAI研修LPはこちら', kind:'最新LP', url:'https://example.com/v2', target:'全体', published:true, order:'1' });
saveNotice_({ title:'アルファ様限定のご案内', kind:'お知らせ', target:a1.id, published:true, order:'2' });
saveNotice_({ title:'下書き', kind:'お知らせ', target:'全体', published:false, order:'3' });
ok(noticesForAgency_(a1.id).length === 2, 'アルファには全体＋限定の2件');
ok(noticesForAgency_(a2.id).length === 1, 'ベータには全体の1件のみ');
ok(noticesForAgency_(a1.id)[0].title === '最新のAI研修LPはこちら', '表示順で並ぶ');

head('12. マイページURL / 管理画面URL');
const base = getSettings_()['ウェブアプリURL'];
const ab = adminBoard_(adminToken);
ok(ab.agencies[0].mypageUrl === base + '?a=' + findAgencyById_(a1.id).token, 'マイページURLが組み立てられる');
const oldToken = findAgencyById_(a1.id).token;
rotateAgencyToken_(a1.id);
ok(findAgencyByToken_(oldToken) === null, 'URL再発行で古いURLは無効になる');
ok(findAgencyByToken_(findAgencyById_(a1.id).token).id === a1.id, '新しいURLは有効');

head('13. 停止中の代理店');
updateAgency_({ id: a2.id, name: 'ベータ商事', active: '停止' });
let stopped = false;
try { requireAgency_(findAgencyById_(a2.id).token); } catch(e){ stopped = true; }
ok(stopped, '停止した代理店はページを開けない');

head('14. 通知メール');
setSetting_('通知先メールアドレス', 'sales@example.com');
MailApp.sent = [];
createReferral_(findAgencyById_(a1.id), { kind:'顧客紹介', name:'通知テスト' }, 'アルファ株式会社');
ok(MailApp.sent.length === 1, '新規登録で通知メールが飛ぶ');
ok(MailApp.sent[0].subject.indexOf('顧客紹介') > 0, '件名に種別が入る', MailApp.sent[0].subject);
setSetting_('新規登録メール通知', 'OFF');
MailApp.sent = [];
createReferral_(findAgencyById_(a1.id), { kind:'顧客紹介', name:'通知OFFテスト' }, 'アルファ株式会社');
ok(MailApp.sent.length === 0, 'OFFにすると飛ばない');

head('15. 画面に渡すデータ');
const ab2 = adminBoard_(adminToken);
ok(ab2.options.statuses.length === 7 && ab2.options.kinds.length === 2, '選択肢が設定シートから供給される');
ok(typeof ab2.referrals[0].memo === 'string', '管理画面には弊社メモが渡る');
ok(jsonForHtml_({ x: '</script><script>alert(1)</script>' }).indexOf('</script>') < 0, 'HTML埋め込み用JSONで < がエスケープされる');


head('16. 代理店候補の取り分（トスアップ / 自己管理）');
// セクション12でトークンを再発行しているので、以降は都度取り直す
const tok = () => findAgencyById_(a1.id).token;
const ag = findAgencyById_(a1.id);
updateAgency_({ id: ag.id, name: ag.name, rate: 20 });
const p1 = createReferral_(findAgencyById_(a1.id), { kind:'代理店紹介', name:'トス 太郎' }, 'アルファ株式会社');
ok(findReferralById_(p1.id).ownership === 'トスアップ', '代理店紹介の既定はトスアップ');
ok(Number(findReferralById_(p1.id).rateSelf) === 3, 'トスアップなら設定の3%が入る', findReferralById_(p1.id).rateSelf);
ok(findReferralById_(p1.id).rateTarget === '', 'トスアップでは候補の取り分を持たない');

apiAgencyUpdateReferral(tok(), p1.id, { ownership:'自己管理', rateTarget:'15', rateSelf:'5' });
const p1b = findReferralById_(p1.id);
ok(p1b.ownership === '自己管理' && Number(p1b.rateTarget) === 15 && Number(p1b.rateSelf) === 5,
   '自己管理なら候補15% / 自分5% に分けられる', [p1b.rateTarget, p1b.rateSelf]);

let over = '';
try { apiAgencyUpdateReferral(tok(), p1.id, { ownership:'自己管理', rateTarget:'18', rateSelf:'5' }); }
catch(e){ over = e.message; }
ok(over.indexOf('20%') >= 0, '基本20%を超える配分は弾かれる', over);
ok(Number(findReferralById_(p1.id).rateTarget) === 15, '弾かれたときは元の値のまま');

updateAgency_({ id: ag.id, name: ag.name, rate: 10 });
let over10 = false;
try { apiAgencyUpdateReferral(tok(), p1.id, { ownership:'自己管理', rateTarget:'8', rateSelf:'5' }); } catch(e){ over10 = true; }
ok(over10, '基本10%の代理店なら13%配分は弾かれる');
apiAgencyUpdateReferral(tok(), p1.id, { ownership:'自己管理', rateTarget:'7', rateSelf:'3' });
ok(Number(findReferralById_(p1.id).rateTarget) === 7, '10%以内なら通る');

apiAgencyUpdateReferral(tok(), p1.id, { kind:'顧客紹介' });
ok(findReferralById_(p1.id).ownership === '' && findReferralById_(p1.id).rateSelf === '',
   '顧客紹介に変えたら取り分は消える');
apiAgencyUpdateReferral(tok(), p1.id, { kind:'代理店紹介' });

head('17. 代理店候補ごとのLP');
apiAdminUpdateReferral(adminToken, p1.id, { partnerLp:'https://example.com/lp?ref=AG-001-P1' });
ok(findReferralById_(p1.id).partnerLp.indexOf('AG-001-P1') > 0, '弊社が候補用LPを発行できる');
const shown = agencyBoard_(findAgencyById_(a1.id)).referrals.filter(r => r.id === p1.id)[0];
ok(shown.partnerLp.indexOf('AG-001-P1') > 0, '代理店のマイページに候補用LPが渡る');
apiAgencyUpdateReferral(tok(), p1.id, { partnerLp:'https://evil.example/横取り' });
ok(findReferralById_(p1.id).partnerLp.indexOf('AG-001-P1') > 0, '代理店は候補用LPを書き換えられない');

head('18. 説明会');
const bf1 = saveBriefing_({ startAt:'2099/09/03 15:00', kind:'代理店向け説明会', capacity:'10', open:true });
saveBriefing_({ startAt:'2099/09/10 15:00', kind:'代理店向け説明会', open:false });
saveBriefing_({ startAt:'2000/01/01 10:00', kind:'代理店向け説明会', open:true });
ok(listBriefings_().length === 3, '日程を3件登録できる');
ok(openBriefings_().length === 1, '公開中かつ未来の日程だけが代理店に見える', openBriefings_().map(x=>x.startAt));
apiAgencyUpdateReferral(tok(), p1.id, { briefing:'案内済', briefingId: bf1.id });
const p1c = findReferralById_(p1.id);
ok(p1c.briefing === '案内済' && p1c.briefingId === bf1.id, '代理店が説明会の案内を記録できる');
ok(p1c.briefingAt === '2099/09/03 15:00', '日程IDから日時が自動で入る', p1c.briefingAt);
ok(agencyBoard_(findAgencyById_(a1.id)).briefings.length === 1, 'マイページに日程が渡る');

head('19. 目標件数');
setSetting_('紹介の目標件数', '10');
ok(agencyBoard_(findAgencyById_(a1.id)).goal === 10, '目標件数が画面に渡る');
setSetting_('紹介の目標件数', '5');
ok(agencyBoard_(findAgencyById_(a1.id)).goal === 5, '設定を変えると即座に反映される');
setSetting_('紹介の目標件数', '10');

head('20. 紹介文をつくる');
setSetting_('文面AIリライト', 'OFF');
const plain = generateCopy_(findAgencyById_(a1.id),
  { target:'お客様', channel:'LINE', values:{ '{相手}':'佐藤', '{自分}':'田中', '{会社}':'弊社', '{LP}':'https://example.com/lp' } },
  getSettings_());
ok(plain.items.length >= 1, 'テンプレートから文面が出る（' + plain.items.length + '案）');
ok(plain.items[0].text.indexOf('{') < 0, '差し込み変数が残らない', plain.items[0].text.slice(0,40));
ok(plain.items[0].text.indexOf('佐藤') >= 0 && plain.items[0].text.indexOf('https://example.com/lp') >= 0,
   '相手の名前とURLが入る');
ok(plain.engine === 'template', '過去文面なしならテンプレートそのまま');

const casual = generateCopy_(findAgencyById_(a1.id), {
  target:'お客様', channel:'LINE',
  values:{ '{相手}':'佐藤', '{自分}':'田中', '{会社}':'弊社', '{LP}':'https://example.com/lp' },
  samples:'こんにちは！僕です！\nこの前の件、めっちゃ良さそうでした！\n佐藤さん、また連絡しますね！！'
}, getSettings_());
ok(casual.engine === 'style', '過去文面があれば文体調整が走る');
ok(casual.items[0].text.indexOf('こんにちは') === 0, 'あいさつがその人のものに置き換わる', casual.items[0].text.slice(0,20));
ok(casual.items[0].text.indexOf('僕') >= 0 || casual.items[0].text.indexOf('私') < 0, '一人称が写る');

const formal = generateCopy_(findAgencyById_(a1.id), {
  target:'代理店候補', channel:'メール',
  values:{ '{相手}':'鈴木', '{自分}':'田中', '{会社}':'弊社', '{LP}':'https://example.com/lp' },
  samples:'いつもお世話になっております。\n株式会社◯◯の田中でございます。\n何卒よろしくお願い申し上げます。'
}, getSettings_());
ok(formal.items.length >= 1, '代理店候補向け・メールの文面も出る');
ok(formal.items[0].text.indexOf('様') >= 0, '敬称の手がかりがない文体では、テンプレートの「様」を崩さない');

const sanUser = generateCopy_(findAgencyById_(a1.id), {
  target:'代理店候補', channel:'メール',
  values:{ '{相手}':'鈴木', '{自分}':'田中', '{会社}':'弊社', '{LP}':'https://example.com/lp' },
  samples:'鈴木さん、お疲れさまです。田中です。\n先日はありがとうございました。またご連絡しますね。'
}, getSettings_());
ok(sanUser.items[0].text.indexOf('鈴木さん') >= 0 && sanUser.items[0].text.indexOf('鈴木様') < 0,
   '「さん」で呼ぶ人には「さん」に揃う', sanUser.items[0].text.slice(0,16));

let noTpl = false;
try { generateCopy_(findAgencyById_(a1.id), { target:'お客様', channel:'FAX' }, getSettings_()); } catch(e){ noTpl = true; }
ok(!noTpl, '未知のチャネルはLINEに丸められて落ちない');

head('21. 文面テンプレート');
ok(listTemplates_().length === DEFAULT_TEMPLATES.length, '初期テンプレートが入っている（' + listTemplates_().length + '件）');
saveTemplate_({ target:'お客様', channel:'LINE', angle:'テスト', title:'テスト見出し', body:'{相手}さんへ', open:true });
ok(listTemplates_().filter(t => t.title === 'テスト見出し').length === 1, 'テンプレートを追加できる');
const t0 = listTemplates_()[0];
saveTemplate_({ id: t0.id, target:t0.target, channel:t0.channel, angle:t0.angle, title:'書き換え後', body:t0.body, open:true });
ok(listTemplates_().filter(t => t.id === t0.id)[0].title === '書き換え後', '既存テンプレートを上書きできる');
seedTemplates_();
ok(listTemplates_().filter(t => t.title === '書き換え後').length === 1, '2回目のセットアップで初期値に戻されない');

head('22. UIバージョンの切り替え');
ok(uiVersion_(null, getSettings_()) === 'v2', '既定はv2');
ok(uiVersion_('v1', getSettings_()) === 'v1', 'URLの ui=v1 で旧デザインに戻せる');
setSetting_('UIバージョン', 'v1');
ok(uiVersion_(null, getSettings_()) === 'v1', '設定シートでも切り替えられる');
setSetting_('UIバージョン', 'v2');

head('23. 列を増やしても既存データがズレない');
{
  const sh = sheet_(SHEETS.REFERRAL);
  const before = findReferralById_(r3.id);
  // 「情報の充足」が末尾（数式列）のままであること
  const headers = sh.getRange(1, 1, 1, REFERRAL_FIELDS.length).getDisplayValues()[0];
  ok(headers[headers.length - 1] === '情報の充足', '数式列は必ず末尾', headers[headers.length - 1]);
  ok(writableWidth_(REFERRAL_FIELDS) === REFERRAL_FIELDS.length - 1, 'スクリプトは数式列に書かない');
  setupSpreadsheet();
  const after = findReferralById_(r3.id);
  ok(after.name === before.name && after.email === before.email && after.status === before.status,
     '再セットアップしても既存の紹介データは変わらない');
  ok(findAgencyById_(a1.id).rate !== '', '代理店の基本マージン率も保たれる');
}

head('24. 開き直しても内容が保持されるか（ページを閉じて開き直す想定）');
{
  // 「ページを開く」＝ doGet が agencyBoard_ をゼロから組み立てる、という動作をそのまま呼ぶ
  const openPage = (agencyId) => agencyBoard_(findAgencyById_(agencyId));
  const findIn = (board, id) => board.referrals.filter(r => r.id === id)[0];

  // (1) 代理店が入力 → 閉じる → 開き直す
  const s1 = createReferral_(findAgencyById_(a1.id),
    { kind:'顧客紹介', company:'保持テスト株式会社', name:'保持 太郎', email:'hoji@example.jp',
      phone:'090-0000-1111', detail:'ページを閉じて開き直しても残るか' }, 'アルファ株式会社');
  const open1 = openPage(a1.id);
  ok(findIn(open1, s1.id).name === '保持 太郎', '登録直後に開き直しても残っている');

  const open2 = openPage(a1.id);   // 何度開いても
  ok(findIn(open2, s1.id).detail === 'ページを閉じて開き直しても残るか', '2回目に開いても中身は同じ');
  ok(open1.referrals.length === open2.referrals.length, '開くたびに件数が増えたり減ったりしない');

  // (2) 代理店が入力しないので、弊社が代わりに情報を足す → 代理店のページに出る
  apiAdminUpdateReferral(adminToken, s1.id, {
    company:'保持テスト株式会社（正式名称）', phone:'03-9999-0000',
    detail:'弊社側で追記した詳細', status:'アプローチ中', memo:'これは社内メモ'
  });
  const open3 = openPage(a1.id);
  const seen = findIn(open3, s1.id);
  ok(seen.company === '保持テスト株式会社（正式名称）', '弊社が直した会社名が代理店のページに出る');
  ok(seen.detail === '弊社側で追記した詳細', '弊社が追記した詳細も出る');
  ok(seen.status === 'アプローチ中', '弊社が変えたステータスも出る');
  ok(seen.memo === undefined, '社内メモだけは代理店に渡らない');

  // (3) 弊社がスプレッドシートを直接書き換えた場合も反映される
  {
    const row = findReferralById_(s1.id)._row;
    const col = fieldIndex_(REFERRAL_FIELDS, 'name') + 1;
    sheet_(SHEETS.REFERRAL).getRange(row, col).setValue('保持 太郎（シート直編集）');
    ok(findIn(openPage(a1.id), s1.id).name === '保持 太郎（シート直編集）',
       'スプレッドシートを手で直しても、次に開いたときに反映される');
  }

  // (4) 弊社が代理店の代わりに新規登録 → その代理店のページに現れる
  apiAdminCreateReferral(adminToken, a1.id,
    { kind:'顧客紹介', name:'弊社入力 花子', company:'ラムダ商事' });
  const open4 = openPage(a1.id);
  const added = open4.referrals.filter(r => r.name === '弊社入力 花子')[0];
  ok(!!added, '弊社が入力した紹介が、代理店のページに出てくる');
  ok(added.updatedBy === '弊社', '誰が入れたかも残る');

  // (5) 他社のページには出ない
  const other = agencyBoard_(findAgencyById_(a2.id));
  ok(!other.referrals.filter(r => r.name === '弊社入力 花子').length, '別の代理店のページには出ない');

  // (6) 代理店が直したら、弊社側（管理画面）にも即反映
  apiAgencyUpdateReferral(tok(), s1.id, { email:'kaki-naoshi@example.jp' });
  const adminSees = adminBoard_(adminToken).referrals.filter(r => r.id === s1.id)[0];
  ok(adminSees.email === 'kaki-naoshi@example.jp', '代理店の修正が管理画面にも出る');
  ok(adminSees.memo === 'これは社内メモ', '代理店が触っても社内メモは消えない');

  // (7) URLを再発行しても中身は残る（変わるのはURLだけ）
  const beforeCount = openPage(a1.id).referrals.length;
  rotateAgencyToken_(a1.id);
  ok(openPage(a1.id).referrals.length === beforeCount, 'URLを再発行しても紹介データは残る');
  ok(findAgencyByToken_(findAgencyById_(a1.id).token).id === a1.id, '新しいURLで同じページが開く');

  // (8) 設定を変えると、次に開いたときに反映される（アプリ側の即時反映）
  setSetting_('紹介の目標件数', '30');
  ok(openPage(a1.id).goal === 30, '設定シートの変更が、次に開いたときに反映される');
  setSetting_('紹介の目標件数', '10');
}

console.log('\n────────────────────────');
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
