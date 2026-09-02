#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""業務プロセスと課題ページを JSON データから HTML/PDF 生成する。

使い方:
    python render.py <input.json> <output.pdf>

    出力 <output.pdf> と同じ場所に <output.pdf>.html（=<output.pdf> のHTML）を必ず書き出す。
    PDF 化は環境に weasyprint があればその場で行うが、weasyprint が無い/失敗しても
    HTML は必ず残る。Windows では weasyprint を使わず、生成された .html を
    ヘッドレス Chrome/Edge（monthly-report-deck/scripts/html-to-pdf.ps1）で PDF 化する。
    HTML だけ欲しいときは python render.py <input.json> <output.html> --html-only。

input.json の形式:
{
  "pages": [
    {
      "cat": "AI業務変革白書 ／ コールセンター業界",   # 右肩の小見出し
      "title": "インバウンド",                          # 【title】業務プロセスと課題
      "leads": [
        "インバウンド対応の業務プロセスを4フェーズ、11ステップに分解",
        "特に<b>「一次応答」「エスカレーション」「後処理」</b>の業務負荷が高い"
      ],
      "layout": "phases",          # "phases"（フェーズ列）or "lanes"（対◯◯レーン）
      "hot": ["③", "⑦", "⑩"],     # 負荷の高いステップ番号（赤ハイライト＝課題と対応）
      "groups": [
        ["受付", [["①","着信受付"], ["②","本人確認"]]],
        ["対応", [["③","一次応答"], ["④","回答提示"]]]
      ],
      "challenges": [              # 3〜4枚
        {"t": "③ 一次応答", "b": "...", "icon": "headset"}
      ],
      "pageno": "04"               # 任意。フッターのページ番号
    }
  ]
}

lanes レイアウトのとき label に "対|求職者" のように "|" を入れると2行表示。
icon に使えるキーは process_engine.ICON のキー（people, merge, house, helmet, factory,
truck, bank, bag, heart, cap, megaphone, play, headset, clipboard, city, briefcase,
doccheck, pencil, calcheck, userheart, gear, chart, shield, box, cart, pill, film,
plane, fork, doc）。
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import process_engine as E

def _ensure_fontconfig():
    # 最小 fontconfig を使うとレンダリングのハングを避けられる
    home = os.path.expanduser('~')
    conf = os.path.join(home, 'fcmin', 'fonts.conf')
    if os.path.exists(conf) and not os.environ.get('FONTCONFIG_FILE'):
        os.environ['FONTCONFIG_FILE'] = conf

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    html_only = '--html-only' in sys.argv
    if len(args) < 2:
        print(__doc__); sys.exit(1)
    inp, out = args[0], args[1]
    data = json.load(open(inp, encoding='utf-8'))
    pages = data['pages'] if isinstance(data, dict) else data
    # JSON の steps はリスト [num,text] なのでタプル化（process_engine 互換）
    for p in pages:
        p['groups'] = [(lab, [tuple(s) for s in steps]) for lab, steps in p['groups']]
    html = E.build_html(pages)
    # HTML は常に書き出す。out が .pdf でも <out>.html を、.html なら out 自身を使う。
    html_path = out if out.lower().endswith('.html') else out + '.html'
    open(html_path, 'w', encoding='utf-8').write(html)
    print(f'HTML: {html_path}  ({len(pages)} page)')
    if html_only or out.lower().endswith('.html'):
        return
    # PDF 化: weasyprint があれば使う。無ければ HTML を残して終了し、
    # Windows ではヘッドレス Chrome/Edge（html-to-pdf.ps1）で PDF 化する。
    _ensure_fontconfig()
    try:
        from weasyprint import HTML
    except Exception:
        print('NOTE: weasyprint が無いため PDF は未生成。'
              f'{html_path} をヘッドレス Chrome/Edge で PDF 化してください。')
        return
    HTML(string=html).write_pdf(out)
    print(f'OK: {out}  ({len(pages)} page)')

if __name__ == '__main__':
    main()
