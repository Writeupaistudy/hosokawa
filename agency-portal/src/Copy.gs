/**
 * Copy.gs — 「紹介文をつくる」機能
 *
 * 代理店がLINE／メールでサクッと送れる紹介文を用意します。
 *   1. 弊社が用意したテンプレート（文面テンプレートシートで編集できます）
 *   2. 代理店が過去に送った文面を貼ると、その人の文体に寄せて書き換える
 *      - 設定の「文面AIリライト」が ON かつ Claude APIキーがあれば Claude で書き換え
 *      - OFF／キーなしでも、文体の特徴を写し取るルールベースの書き換えが動きます
 */

/** 初期テンプレート（文面テンプレートシートが空のときだけ入ります） */
var DEFAULT_TEMPLATES = [
  {
    order: '10', target: 'お客様', channel: 'LINE', angle: '現場の困りごとから',
    title: '手作業がまだ多い会社に',
    body: 'お疲れさまです。{自分}です。\n\n先日お話しされていた「{相手}さんのところの手作業が多い」件、'
        + '{会社}さんのAI活用研修が合いそうだなと思って連絡しました。\n\n'
        + '現場の人がその日から使えるところまで教えてくれる研修で、私のまわりでも評判が良いです。\n'
        + '内容だけでも見てみませんか？\n{LP}'
  },
  {
    order: '20', target: 'お客様', channel: 'LINE', angle: '時間が浮く話',
    title: '工数削減の切り口',
    body: 'お疲れさまです。{自分}です。\n\n{相手}さんのところ、資料づくりや議事録にけっこう時間取られていましたよね。\n'
        + 'そのあたりを実際に短くするための研修があるので共有します。\n\n'
        + '「AIを勉強する」ではなく「明日から自分の仕事で使う」内容なので、腹落ちしやすいと思います。\n{LP}'
  },
  {
    order: '30', target: 'お客様', channel: 'メール', angle: 'きちんと紹介する',
    title: 'メールでの紹介（丁寧め）',
    body: '{相手}様\n\nいつもお世話になっております。{自分}です。\n\n'
        + '先日お伺いした業務効率化のお話に関連して、{会社}様のAI活用研修をご紹介させてください。\n\n'
        + '座学だけで終わらず、参加された方がその場でご自身の業務に当てはめるところまで進める内容です。\n'
        + '導入前に無料の説明会もございますので、まずは雰囲気だけでもご覧いただければと思います。\n\n'
        + '{LP}\n\nご興味がありましたら、私から先方へおつなぎいたします。\n\n{自分}'
  },
  {
    order: '40', target: 'お客様', channel: 'LINE', angle: 'まず説明会だけ',
    title: '説明会に誘う',
    body: 'お疲れさまです。{自分}です。\n\n以前話していたAI活用の件、{会社}さんが説明会をやっているので'
        + 'よかったら出てみませんか？\n\n日時：{日時}\n\n'
        + '売り込みというより「いまAIで何ができるのか」を整理する場なので、聞くだけでも損はないと思います。\n{LP}'
  },
  {
    order: '50', target: '代理店候補', channel: 'LINE', angle: '一緒に取り扱う',
    title: '取扱いに誘う（LINE）',
    body: 'お疲れさまです。{自分}です。\n\n最近うちで扱っている{会社}さんのAI研修とAIバード、'
        + '{相手}さんのお客さんにもハマりそうだなと思って連絡しました。\n\n'
        + '紹介するだけでも成立する形なので、負担はそんなに大きくないです。\n'
        + 'まず条件だけ聞いてみませんか？\n{LP}'
  },
  {
    order: '60', target: '代理店候補', channel: 'LINE', angle: '既存のお客さんに出せる',
    title: '既存顧客への上乗せ提案',
    body: 'お疲れさまです。{自分}です。\n\n{相手}さんはすでに顧客との関係ができているので、'
        + 'そこにAI研修を一本足すだけで話が通りやすいと思います。\n\n'
        + '私も同じやり方で進めていて、思ったより自然に決まりました。\n'
        + '詳しい条件はこちらです。\n{LP}'
  },
  {
    order: '70', target: '代理店候補', channel: 'メール', angle: 'きちんと提案する',
    title: 'メールでの代理店お誘い',
    body: '{相手}様\n\nいつもお世話になっております。{自分}です。\n\n'
        + '弊社で取り扱っている{会社}様のAI活用研修・AIバードについて、'
        + '{相手}様にも取扱いをご検討いただけないかと思いご連絡いたしました。\n\n'
        + 'ご紹介いただくだけの形から、ご自身で商談まで進めていただく形まで選べます。\n'
        + 'まずは説明会で概要をご確認いただければと思います。\n\n{LP}\n\n{自分}'
  },
  {
    order: '80', target: '代理店候補', channel: 'LINE', angle: 'まず説明会だけ',
    title: '説明会に誘う（代理店候補）',
    body: 'お疲れさまです。{自分}です。\n\n{会社}さんが代理店向けの説明会をやっているので、'
        + '{相手}さんも一度聞いてみませんか？\n\n日時：{日時}\n\n'
        + 'その場で決める必要はないので、条件を知るだけでも良いと思います。\n{LP}'
  }
];

/** 差し込み変数の説明（画面に出します） */
var COPY_VARIABLES = [
  { key: '{相手}', label: '紹介先のお名前' },
  { key: '{自分}', label: 'ご自身のお名前' },
  { key: '{会社}', label: '弊社名' },
  { key: '{LP}',  label: 'ご案内するURL' },
  { key: '{日時}', label: '説明会の日時' }
];

/* ------------------------------------------------------------------ */
/* 文体の分析                                                           */
/* ------------------------------------------------------------------ */

/**
 * 過去に送った文面から、その人の書き癖を取り出す。
 * 文末の言い回しを機械的に変換すると壊れやすいので、
 * 「壊れずに写せる特徴」だけを見ています。
 */
function analyzeStyle_(samples) {
  var text = String(samples || '');
  var lines = text.split('\n');
  var chars = text.length || 1;

  var emojiMatches = text.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu) || [];
  var kaomoji = (text.match(/\([^)]{1,8}\)/g) || []).filter(function (s) { return /[\^ﾟ・><ω;'`]/.test(s); });

  var firstPerson = '私';
  ['僕', '俺', '自分', '弊社', '私'].forEach(function (w) {
    if (text.indexOf(w) >= 0 && firstPerson === '私') firstPerson = w;
  });
  if (/僕/.test(text)) firstPerson = '僕';

  var greeting = '';
  var greetings = ['お疲れさまです', 'お疲れ様です', 'おつかれさまです', 'いつもお世話になっております',
                   'お世話になっております', 'こんにちは', 'ご無沙汰しております', '突然すみません'];
  for (var i = 0; i < greetings.length; i++) {
    if (text.indexOf(greetings[i]) >= 0) { greeting = greetings[i]; break; }
  }

  return {
    hasSamples: text.trim().length >= 20,
    emoji: emojiMatches.slice(0, 6),
    emojiRate: emojiMatches.length / Math.max(chars / 100, 1),
    kaomoji: kaomoji.slice(0, 3),
    exclaim: (text.match(/[!！]/g) || []).length / Math.max(chars / 100, 1),
    firstPerson: firstPerson,
    // 敬称は「はっきり分かるときだけ」寄せる。手がかりがなければテンプレートのまま。
    honorific: (/様/.test(text) && !/さん/.test(text)) ? '様'
             : (/さん/.test(text) && !/様/.test(text)) ? 'さん' : '',
    greeting: greeting,
    // 1行あたりの文字数。短いほど改行を多く入れる人。
    lineLength: chars / Math.max(lines.filter(function (l) { return l.trim(); }).length, 1),
    blankLine: /\n\s*\n/.test(text),
    polite: !/(だ|だよ|だね|かな|しよう|してる)[。！!\n]/.test(text) || /(です|ます)/.test(text)
  };
}

/** テンプレートに、書き癖と差し込み値をあてる */
function applyStyle_(body, style, values) {
  var out = String(body);

  // 差し込み
  COPY_VARIABLES.forEach(function (v) {
    var val = values[v.key] !== undefined ? String(values[v.key]) : '';
    out = out.split(v.key).join(val);
  });

  if (style && style.hasSamples) {
    // 呼び方（手がかりがあるときだけ）
    if (style.honorific === '様') out = out.replace(/さん/g, '様');
    else if (style.honorific === 'さん') out = out.replace(/様/g, 'さん');

    // 冒頭のあいさつ
    if (style.greeting) {
      out = out.replace(/^(お疲れさまです|お疲れ様です|いつもお世話になっております)[。、]?/, style.greeting + '。');
    }

    // 一人称
    if (style.firstPerson && style.firstPerson !== '私') {
      out = out.replace(/(^|[\n、。\s])私(?![たち])/g, '$1' + style.firstPerson);
    }

    // テンションが高い人は言い切りに「！」を足す
    if (style.exclaim > 1.2) {
      out = out.replace(/思います。/g, '思います！').replace(/ませんか？/g, 'ませんか？！');
    }

    // 絵文字をよく使う人は行末に添える
    if (style.emojiRate > 0.8 && style.emoji.length) {
      var picks = style.emoji;
      var n = 0;
      out = out.split('\n').map(function (line) {
        if (!line.trim() || line.indexOf('http') >= 0) return line;
        if (n++ % 3 !== 1) return line;
        return line + picks[n % picks.length];
      }).join('\n');
    } else if (style.emojiRate < 0.05) {
      out = out.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '');
    }

    // 短い行で改行する人には、句点で改行を入れる
    if (style.lineLength < 26) {
      out = out.replace(/。(?![\n」])/g, '。\n');
    }
    if (!style.blankLine) out = out.replace(/\n\s*\n/g, '\n');
  }

  return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* ------------------------------------------------------------------ */
/* Claude API（任意）                                                   */
/* ------------------------------------------------------------------ */

function claudeEnabled_(settings) {
  return String(settings['文面AIリライト'] || 'OFF').toUpperCase() === 'ON'
      && String(settings['Claude APIキー'] || '').trim() !== '';
}

/** effort を受け付けないモデルには送らない */
function supportsEffort_(model) {
  return /^claude-(opus-5|opus-4-|sonnet-5|fable-5|mythos-5)/.test(model);
}

function callClaude_(settings, system, userText) {
  var key = String(settings['Claude APIキー'] || '').trim();
  var model = String(settings['Claudeモデル'] || 'claude-opus-5').trim() || 'claude-opus-5';

  var body = {
    model: model,
    max_tokens: 4000,
    system: system,
    messages: [{ role: 'user', content: userText }]
  };
  if (supportsEffort_(model)) body.output_config = { effort: 'low' };

  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify(body)
  });

  var code = res.getResponseCode();
  var json;
  try { json = JSON.parse(res.getContentText()); } catch (e) { json = null; }
  if (code !== 200 || !json) {
    var msg = json && json.error ? json.error.message : res.getContentText().slice(0, 200);
    throw new Error('Claude API エラー（' + code + '）: ' + msg);
  }
  if (json.stop_reason === 'refusal') {
    throw new Error('この内容はAIが書き換えを断りました。テンプレートのままご利用ください。');
  }
  // content は配列。thinking ブロックが混ざるので text だけを取り出す。
  return (json.content || [])
    .filter(function (b) { return b.type === 'text'; })
    .map(function (b) { return b.text; })
    .join('\n')
    .trim();
}

/** 応答から JSON 配列を取り出す（前後に説明文が付いていても拾えるように） */
function extractJsonArray_(text) {
  var s = String(text);
  var start = s.indexOf('[');
  var end = s.lastIndexOf(']');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(s.slice(start, end + 1)); } catch (e) { return null; }
}

/* ------------------------------------------------------------------ */
/* 生成                                                                 */
/* ------------------------------------------------------------------ */

/**
 * 文面を作る。
 * @param {Object} req { target, channel, values, samples, angles }
 * @return {{items: Array, engine: string, note: string}}
 */
function generateCopy_(agency, req, settings) {
  var target = req.target === '代理店候補' ? '代理店候補' : 'お客様';
  var channel = req.channel === 'メール' ? 'メール' : 'LINE';
  var values = req.values || {};
  var style = analyzeStyle_(req.samples);

  var pool = listTemplates_().filter(function (t) {
    return t.target === target && t.channel === channel;
  });
  if (!pool.length) pool = listTemplates_().filter(function (t) { return t.target === target; });
  if (!pool.length) throw new Error('この条件に使えるテンプレートがありません。管理画面の［文面テンプレート］に追加してください。');

  var base = pool.slice(0, 3);
  var items = base.map(function (t) {
    return { angle: t.angle || t.title, title: t.title, text: applyStyle_(t.body, style, values) };
  });

  if (!style.hasSamples || !claudeEnabled_(settings)) {
    return {
      items: items,
      engine: style.hasSamples ? 'style' : 'template',
      note: style.hasSamples
        ? '過去の文面から、あいさつ・一人称・呼び方・絵文字・改行の癖を写して調整しました。'
        : '弊社が用意した文面です。過去に送ったメッセージを貼ると、あなたの書き方に寄せて調整します。'
    };
  }

  var system = 'あなたは日本のB2B営業の現場で、紹介メッセージの下書きを整える編集者です。'
    + '与えられた「その人が実際に送った過去のメッセージ」から文体（敬体か常体か、あいさつ、一人称、'
    + '相手の呼び方、絵文字や記号の使い方、改行の細かさ、テンションの高さ）を読み取り、'
    + 'その人が自分で書いたとしか思えない文章に書き換えてください。'
    + '\n\n守ること：'
    + '\n- 事実を足さない。テンプレートに書かれていない実績・数値・価格・機能を作らない。'
    + '\n- 差し込み済みの固有名詞とURLはそのまま残す。'
    + '\n- ' + (channel === 'LINE' ? 'LINEなので、件名は付けず、短い段落で読みやすく。' : 'メールなので、宛名と署名を残し、丁寧に。')
    + '\n- 誇張した売り込みや煽りにしない。紹介者が友人に伝える温度感で。'
    + '\n\n出力は次のJSON配列だけを返してください（説明文は不要）：'
    + '\n[{"angle":"訴求軸の短い名前","text":"本文"}]';

  var user = '## その人が過去に送ったメッセージ\n' + String(req.samples).slice(0, 4000)
    + '\n\n## 書き換えるテンプレート（' + target + '向け・' + channel + '）\n'
    + items.map(function (it, i) { return (i + 1) + '. 訴求軸「' + it.angle + '」\n' + it.text; }).join('\n\n')
    + '\n\n上の ' + items.length + ' 本を、それぞれ訴求軸を保ったまま、この人の文体で書き換えてください。';

  try {
    var raw = callClaude_(settings, system, user);
    var arr = extractJsonArray_(raw);
    if (arr && arr.length) {
      return {
        items: arr.slice(0, 4).map(function (x, i) {
          return {
            angle: String(x.angle || (items[i] && items[i].angle) || '案' + (i + 1)),
            title: (items[i] && items[i].title) || '',
            text: String(x.text || '').trim()
          };
        }).filter(function (x) { return x.text; }),
        engine: 'claude',
        note: 'あなたが過去に送った文面をもとに、AIが文体を合わせて書き換えました。送る前に一度ご確認ください。'
      };
    }
  } catch (err) {
    console.error('Claude書き換えに失敗: ' + err);
    return {
      items: items,
      engine: 'style-fallback',
      note: 'AIでの書き換えに失敗したため、文体を写す簡易調整でお出ししています。（' + err.message + '）'
    };
  }
  return { items: items, engine: 'style', note: '過去の文面から書き方の癖を写して調整しました。' };
}
