/**
 * 画面確認用のプレビュー生成。
 * GAS のテンプレート記法をダミーデータに差し替えて、素の HTML として保存します。
 *   node test/build-preview.cjs   →  test/preview/agency.html, admin.html
 */
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..', 'src');
const out = path.join(__dirname, 'preview');
fs.mkdirSync(out, { recursive: true });

const styles = {
  Agency: fs.readFileSync(path.join(src, 'Style.html'), 'utf8'),
  Admin: fs.readFileSync(path.join(src, 'Style.html'), 'utf8'),
  AgencyV2: fs.readFileSync(path.join(src, 'StyleV2.html'), 'utf8'),
  AdminV2: fs.readFileSync(path.join(src, 'StyleV2.html'), 'utf8')
};
const statusColors = {
  '新規':{bg:'#e8f0fe',fg:'#1a56c4'},'アプローチ中':{bg:'#fff4e0',fg:'#a55a00'},
  '商談中':{bg:'#efe6ff',fg:'#6b34c9'},'稼働中':{bg:'#e3f6e9',fg:'#137a3d'},
  '保留':{bg:'#f0f1f3',fg:'#5a616b'},'失注':{bg:'#fde8e8',fg:'#b3261e'},
  '取り下げ':{bg:'#f0f1f3',fg:'#5a616b'}
};
const options = {
  statuses:['新規','アプローチ中','商談中','稼働中','保留','失注','取り下げ'],
  lostReasons:['ニーズなし','代理店化を辞退','音信不通','予算が合わない','競合他社に決定','時期尚早','その他'],
  products:['AIバード','AI活用研修','両方','未定'],
  kinds:['顧客紹介','代理店紹介'],
  requiredKeys:['company','name','email','phone','detail'],
  requiredLabels:{company:'会社名',name:'氏名',email:'メール',phone:'電話',detail:'詳細'},
  ownerships:['トスアップ','自己管理'],
  briefingStates:['未案内','案内済','日程調整中','予約確定','参加済','不参加'],
  statusColors,
  variables:[{key:'{相手}',label:'紹介先のお名前'},{key:'{自分}',label:'ご自身のお名前'},
             {key:'{会社}',label:'弊社名'},{key:'{LP}',label:'ご案内するURL'},{key:'{日時}',label:'説明会の日時'}]
};
const R = (o) => Object.assign({
  createdAt:'2026/08/01 10:00:00', updatedAt:'2026/08/20 12:00:00', kind:'顧客紹介',
  company:'', name:'', email:'', phone:'', detail:'', product:'', status:'新規',
  lostReason:'', ownership:'', rateSelf:'', rateTarget:'', partnerLp:'',
  briefing:'未案内', briefingId:'', briefingAt:'',
  nextAction:'', memo:'', updatedBy:'株式会社アルファ商事'
}, o);

const agencyRefs = [
  R({id:'R-20260801-A1B2C3', name:'佐藤 一郎', company:'カスタマー株式会社', email:'sato@customer.co.jp', phone:'090-1111-2222', detail:'社内のAI活用研修を検討中。予算は下期。決裁者は情シス部長。', product:'AI活用研修', status:'稼働中'}),
  R({id:'R-20260805-D4E5F6', name:'鈴木 二郎', company:'デルタ工業', email:'suzuki@delta.jp', phone:'', detail:'代理店として一緒に販売したいとのこと。', kind:'代理店紹介', status:'アプローチ中', createdAt:'2026/08/05 09:10:00',
    ownership:'自己管理', rateSelf:'5', rateTarget:'15', partnerLp:'https://example.com/ai-training?ref=AG-001-P02',
    briefing:'予約確定', briefingId:'B-001', briefingAt:'2026/09/03 15:00'}),
  R({id:'R-20260820-V1W2X3', name:'松本 六花', company:'カッパ商会', email:'m@kappa.jp', phone:'090-2222-3333', detail:'保険の代理店。既存顧客が多い。', kind:'代理店紹介', status:'商談中', createdAt:'2026/08/20 09:00:00',
    ownership:'トスアップ', rateSelf:'3', briefing:'案内済', briefingId:'B-001', briefingAt:'2026/09/03 15:00'}),
  R({id:'R-20260812-G7H8I9', name:'高橋 三郎', company:'', email:'', phone:'', detail:'', kind:'顧客紹介', status:'新規', createdAt:'2026/08/12 18:40:00'}),
  R({id:'R-20260715-J1K2L3', name:'伊藤 四郎', company:'イプシロン商会', email:'ito@epsilon.jp', phone:'080-5555-6666', detail:'AIバードに興味あり。他社と比較検討中。', product:'AIバード', status:'商談中', createdAt:'2026/07/15 11:00:00'}),
  R({id:'R-20260620-M4N5O6', name:'渡辺 五郎', company:'ゼータ物産', email:'w@zeta.jp', phone:'03-1234-5678', detail:'一度は前向きだったが、社内事情で見送り。', product:'AI活用研修', status:'失注', lostReason:'時期尚早', createdAt:'2026/06/20 15:20:00'})
];

const agencyBoot = {
  agency:{ id:'AG-001', name:'株式会社アルファ商事', contact:'田中', token:'demo-token', rate:20,
    lpUrl:'https://example.com/ai-training?ref=AG-001', lpNote:'8/20に内容を刷新しました。' },
  company:'株式会社ホソカワ', intro:'ご紹介いただける方の情報をこちらに登録してください。LINEに流れず、進捗もこの画面で確認できます。',
  canEditStatus:true, options,
  goal:10, tossRate:3, aiRewrite:false,
  individualUrl:'https://timerex.net/s/hosokawa/ai-briefing',
  briefings:[
    {id:'B-001',startAt:'2026/09/03 15:00',kind:'代理店向け説明会',capacity:'10',url:'https://zoom.us/j/000',note:'毎週木曜開催。60分。',open:'TRUE',booked:'3'},
    {id:'B-002',startAt:'2026/09/05 11:00',kind:'AI活用研修 説明会',capacity:'20',url:'https://zoom.us/j/111',note:'研修の内容を30分でご説明します。',open:'TRUE',booked:'18'}
  ],
  notices:[
    {id:'N-001',order:'1',kind:'最新LP',title:'【最新版】AI活用研修 説明LP（2026年8月版）',body:'事例を3社ぶん追加しました。今後はこちらをご案内ください。',url:'https://example.com/lp-v2',btnLabel:'LPを見る',target:'全体',published:'TRUE',updatedAt:''},
    {id:'N-002',order:'2',kind:'お知らせ',title:'AIバードの価格改定について',body:'9月1日より新プランに移行します。詳細は資料をご確認ください。',url:'',btnLabel:'',target:'全体',published:'TRUE',updatedAt:''}
  ],
  referrals: agencyRefs
};

const agencies = [
  {id:'AG-001',name:'株式会社アルファ商事',contact:'田中',email:'tanaka@alpha.co.jp',phone:'03-1111-2222',lpUrl:'https://example.com/ai-training?ref=AG-001',lpNote:'',active:'有効',createdAt:'2026/04/01',memo:'',mypageUrl:'https://script.google.com/macros/s/AKfyc.../exec?a=8f2c1a9b7d3e4f6a0b5c2d1e'},
  {id:'AG-002',name:'ベータ商事',contact:'佐々木',email:'sasaki@beta.jp',phone:'',lpUrl:'',lpNote:'',active:'有効',createdAt:'2026/04/10',memo:'',mypageUrl:'https://script.google.com/macros/s/AKfyc.../exec?a=1b2c3d4e5f60718293a4b5c6'},
  {id:'AG-003',name:'ガンマパートナーズ',contact:'村上',email:'m@gamma.jp',phone:'',lpUrl:'https://example.com/ai-training?ref=AG-003',lpNote:'',active:'停止',createdAt:'2026/05/02',memo:'',mypageUrl:'https://script.google.com/macros/s/AKfyc.../exec?a=aa11bb22cc33dd44ee55ff66'}
];
const adminRefs = agencyRefs.map(r => Object.assign({}, r, {agencyId:'AG-001', agencyName:'株式会社アルファ商事'}))
  .concat([
    Object.assign(R({id:'R-20260810-P7Q8R9',name:'中村 六郎',company:'イータ製作所',email:'n@eta.jp',phone:'090-9999-8888',detail:'代理店候補。既存顧客に紹介できる先が多い。',kind:'代理店紹介',status:'稼働中'}),{agencyId:'AG-002',agencyName:'ベータ商事',memo:'8/22 契約締結'}),
    Object.assign(R({id:'R-20260818-S1T2U3',name:'小林 七海',company:'シータ',email:'',phone:'',detail:'',status:'新規'}),{agencyId:'AG-002',agencyName:'ベータ商事'})
  ]);

const adminBoot = {
  token:'demo-admin-token', company:'株式会社ホソカワ',
  webAppUrl:'https://script.google.com/macros/s/AKfyc.../exec',
  sheetUrl:'https://docs.google.com/spreadsheets/d/DEMO/edit',
  options, agencies,
  notices: agencyBoot.notices.map(n => Object.assign({}, n, {published:true})),
  referrals: adminRefs,
  briefings: agencyBoot.briefings.map(x => Object.assign({}, x, {open:true})),
  templates: [
    {id:'T-001',order:'10',target:'お客様',channel:'LINE',angle:'現場の困りごとから',title:'手作業がまだ多い会社に',body:'お疲れさまです。{自分}です。\n\n先日お話しされていた…',open:true},
    {id:'T-005',order:'50',target:'代理店候補',channel:'LINE',angle:'一緒に取り扱う',title:'取扱いに誘う（LINE）',body:'お疲れさまです。{自分}です。\n\n最近うちで扱っている…',open:true}
  ],
  settings: { goal:10, tossRate:3, individualUrl:'https://timerex.net/s/hosokawa/ai-briefing', aiRewrite:false, uiVersion:'v2' }
};

// GAS は page_() の addMetaTag で viewport を足すので、プレビューでも同じ条件にそろえる
const viewportMeta = '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">';

const stub = `<script>
// プレビュー用の google.script.run スタブ。サーバは呼ばず、それらしい結果を返す。
(function(){
  var SAMPLE = { engine:'style', note:'過去の文面から、あいさつ・一人称・呼び方・絵文字・改行の癖を写して調整しました。',
    items:[
      { angle:'現場の困りごとから', text:'お疲れさまです。田中です。\\n\\n先日お話しされていた「山田さんのところの手作業が多い」件、株式会社ホソカワさんのAI活用研修が合いそうだなと思って連絡しました。\\n\\n現場の人がその日から使えるところまで教えてくれる研修で、私のまわりでも評判が良いです。\\n内容だけでも見てみませんか？\\nhttps://example.com/ai-training?ref=AG-001' },
      { angle:'工数削減の切り口', text:'お疲れさまです。田中です。\\n\\n山田さんのところ、資料づくりや議事録にけっこう時間取られていましたよね。\\nそのあたりを実際に短くするための研修があるので共有します。\\n\\n「AIを勉強する」ではなく「明日から自分の仕事で使う」内容なので、腹落ちしやすいと思います。\\nhttps://example.com/ai-training?ref=AG-001' },
      { angle:'まず説明会だけ', text:'お疲れさまです。田中です。\\n\\n以前話していたAI活用の件、株式会社ホソカワさんが説明会をやっているのでよかったら出てみませんか？\\n\\n日時：2026/09/03 15:00\\n\\n売り込みというより「いまAIで何ができるのか」を整理する場なので、聞くだけでも損はないと思います。\\nhttps://example.com/ai-training?ref=AG-001' }
    ] };
  var ok = null, ng = null;
  var api = {
    withSuccessHandler: function(f){ ok = f; return api; },
    withFailureHandler: function(f){ ng = f; return api; },
    apiAgencyGenerateCopy: function(){ setTimeout(function(){ if (ok) ok(SAMPLE); }, 400); },
    apiAgencyRefresh: function(){}, apiAdminRefresh: function(){},
    apiAgencyCreateReferral: function(){}, apiAgencyUpdateReferral: function(){},
    apiAdminCreateReferral: function(){}, apiAdminUpdateReferral: function(){},
    apiAdminSaveAgency: function(){}, apiAdminSaveNotice: function(){},
    apiAdminSaveBriefing: function(){}, apiAdminSaveTemplate: function(){},
    apiAdminRotateAgencyToken: function(){}
  };
  window.google = { script: { run: api } };
})();
</script>`;

function build(name, boot){
  let html = fs.readFileSync(path.join(src, name + '.html'), 'utf8');
  html = html.replace("<?!= include('Style'); ?>", styles[name])
             .replace("<?!= include('StyleV2'); ?>", styles[name])
             .replace('<?!= boot ?>', JSON.stringify(boot))
             .replace('</head>', viewportMeta + '\n' + stub + '\n</head>');
  fs.writeFileSync(path.join(out, name.toLowerCase() + '.html'), html);
  console.log('→ test/preview/' + name.toLowerCase() + '.html');
}
build('Agency', agencyBoot);
build('Admin', adminBoot);
build('AgencyV2', agencyBoot);
build('AdminV2', adminBoot);
