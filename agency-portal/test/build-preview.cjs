/**
 * 画面確認用のプレビュー生成。
 * GAS のテンプレート記法をダミーデータに差し替えて、素の HTML として保存します。
 *   node test/build-preview.cjs   →  test/preview/agency.html, admin.html
 */
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..', 'src');
const out = path.join(__dirname, 'preview');
fs.mkdirSync(out, { recursive: true });

const style = fs.readFileSync(path.join(src, 'Style.html'), 'utf8');
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
  statusColors
};
const R = (o) => Object.assign({
  createdAt:'2026/08/01 10:00:00', updatedAt:'2026/08/20 12:00:00', kind:'顧客紹介',
  company:'', name:'', email:'', phone:'', detail:'', product:'', status:'新規',
  lostReason:'', nextAction:'', memo:'', updatedBy:'株式会社アルファ商事'
}, o);

const agencyRefs = [
  R({id:'R-20260801-A1B2C3', name:'佐藤 一郎', company:'カスタマー株式会社', email:'sato@customer.co.jp', phone:'090-1111-2222', detail:'社内のAI活用研修を検討中。予算は下期。決裁者は情シス部長。', product:'AI活用研修', status:'稼働中'}),
  R({id:'R-20260805-D4E5F6', name:'鈴木 二郎', company:'デルタ工業', email:'suzuki@delta.jp', phone:'', detail:'代理店として一緒に販売したいとのこと。', kind:'代理店紹介', status:'アプローチ中', createdAt:'2026/08/05 09:10:00'}),
  R({id:'R-20260812-G7H8I9', name:'高橋 三郎', company:'', email:'', phone:'', detail:'', kind:'顧客紹介', status:'新規', createdAt:'2026/08/12 18:40:00'}),
  R({id:'R-20260715-J1K2L3', name:'伊藤 四郎', company:'イプシロン商会', email:'ito@epsilon.jp', phone:'080-5555-6666', detail:'AIバードに興味あり。他社と比較検討中。', product:'AIバード', status:'商談中', createdAt:'2026/07/15 11:00:00'}),
  R({id:'R-20260620-M4N5O6', name:'渡辺 五郎', company:'ゼータ物産', email:'w@zeta.jp', phone:'03-1234-5678', detail:'一度は前向きだったが、社内事情で見送り。', product:'AI活用研修', status:'失注', lostReason:'時期尚早', createdAt:'2026/06/20 15:20:00'})
];

const agencyBoot = {
  agency:{ id:'AG-001', name:'株式会社アルファ商事', contact:'田中', token:'demo-token',
    lpUrl:'https://example.com/ai-training?ref=AG-001', lpNote:'8/20に内容を刷新しました。' },
  company:'株式会社ホソカワ', intro:'ご紹介いただける方の情報をこちらに登録してください。LINEに流れず、進捗もこの画面で確認できます。',
  canEditStatus:true, options,
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
  referrals: adminRefs
};

// GAS は page_() の addMetaTag で viewport を足すので、プレビューでも同じ条件にそろえる
const viewportMeta = '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">';

const stub = `<script>
window.google = { script: { run: new Proxy({}, { get: function(t, k){
  if (k === 'withSuccessHandler' || k === 'withFailureHandler') return function(){ return window.google.script.run; };
  return function(){ console.log('call', k, arguments); };
}})}};
</script>`;

function build(name, boot){
  let html = fs.readFileSync(path.join(src, name + '.html'), 'utf8');
  html = html.replace("<?!= include('Style'); ?>", style)
             .replace('<?!= boot ?>', JSON.stringify(boot))
             .replace('</head>', viewportMeta + '\n' + stub + '\n</head>');
  fs.writeFileSync(path.join(out, name.toLowerCase() + '.html'), html);
  console.log('→ test/preview/' + name.toLowerCase() + '.html');
}
build('Agency', agencyBoot);
build('Admin', adminBoot);
