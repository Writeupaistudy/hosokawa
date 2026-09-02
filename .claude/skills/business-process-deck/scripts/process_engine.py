# -*- coding: utf-8 -*-
"""業務プロセスと課題ページ 生成エンジン（自己完結）。
本資料『AI業務変革白書』と同じデザイン・構成のページをHTML→PDFで生成する。
render.py から利用する。"""
import base64, math, html as _html, os

FONT = 'IPAexGothic,"Noto Sans JP",sans-serif'
HERE = os.path.dirname(os.path.abspath(__file__))
LOGO_PATH = os.path.join(HERE, '..', 'assets', 'writeup_logo.png')

def esc(s): return _html.escape(str(s), quote=True)

def logo_uri():
    with open(LOGO_PATH, 'rb') as f:
        return 'data:image/png;base64,' + base64.b64encode(f.read()).decode()

# ---------------- line icons (brand red/navy) ----------------
def _svg(inner, sw="1.8"):
    return (f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{sw}" '
            f'stroke-linecap="round" stroke-linejoin="round">{inner}</svg>')
ICON = {
 'people':_svg('<circle cx="9" cy="8" r="3"/><path d="M3.5 19c0-3 2.5-5.2 5.5-5.2S14.5 16 14.5 19"/><path d="M16 6.6a2.6 2.6 0 0 1 0 5"/><path d="M17 14.2c2.3.5 4 2.4 4 4.8"/>'),
 'merge':_svg('<circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>'),
 'house':_svg('<path d="M4 11l8-6 8 6"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>'),
 'helmet':_svg('<path d="M3 17.5h18"/><path d="M5 17.5v-1.5a7 7 0 0 1 14 0v1.5"/><path d="M10 6.4V4.6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.8"/>'),
 'factory':_svg('<path d="M3 20V10l6 4V10l6 4V7l3-2v15z"/><path d="M3 20h18"/>'),
 'truck':_svg('<path d="M3 6h11v9H3z"/><path d="M14 9h4l3 3v3h-7z"/><circle cx="7" cy="17.6" r="1.6"/><circle cx="17" cy="17.6" r="1.6"/>'),
 'bank':_svg('<path d="M3 9l9-5 9 5"/><path d="M5 9v9M10 9v9M14 9v9M19 9v9"/><path d="M3 20h18"/>'),
 'bag':_svg('<path d="M6 8h12l-1 12H7z"/><path d="M9 8a3 3 0 0 1 6 0"/>'),
 'heart':_svg('<path d="M12 20s-7-4.4-7-9.4A3.5 3.5 0 0 1 12 7a3.5 3.5 0 0 1 7 3.6C19 15.6 12 20 12 20z"/>'),
 'cap':_svg('<path d="M2 9l10-4 10 4-10 4z"/><path d="M6 11v5c0 1.1 3 2.6 6 2.6s6-1.5 6-2.6v-5"/>'),
 'megaphone':_svg('<path d="M3 11v2l11 5V6z"/><path d="M14 8.2a3.4 3.4 0 0 1 0 7.6"/><path d="M5 13v4l3 1"/>'),
 'play':_svg('<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10 9l5 3-5 3z"/>'),
 'headset':_svg('<path d="M4 13.5v-1.5a8 8 0 0 1 16 0v1.5"/><rect x="3" y="13" width="4" height="6.5" rx="1.3"/><rect x="17" y="13" width="4" height="6.5" rx="1.3"/><path d="M20 19.5a3 3 0 0 1-3 3h-3"/>'),
 'clipboard':_svg('<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 3.5h6v3H9z"/><path d="M9 11h6M9 15h4"/>'),
 'city':_svg('<path d="M3 21V9l5-3v15"/><path d="M8 21V11l5 3v7"/><path d="M13 21V8l5-4v17"/><path d="M3 21h18"/>'),
 'briefcase':_svg('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>'),
 'doccheck':_svg('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M9.3 14l2 2 3.4-3.4"/>'),
 'pencil':_svg('<path d="M4 20l4-1L19 8a2 2 0 0 0-3-3L5 16z"/><path d="M14 7l3 3"/>'),
 'calcheck':_svg('<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 9.5h16M8 3v4M16 3v4"/><path d="M9 14.5l2 2 4-4"/>'),
 'userheart':_svg('<circle cx="9" cy="8" r="3.2"/><path d="M3.6 20c0-3.3 2.5-5.6 5.4-5.6 1 0 1.9.2 2.7.6"/><path d="M18 21s-3-1.8-3-4a1.7 1.7 0 0 1 3-1.1 1.7 1.7 0 0 1 3 1.1c0 2.2-3 4-3 4z"/>'),
 'gear':_svg('<circle cx="12" cy="12" r="3.2"/><path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4"/>'),
 'chart':_svg('<path d="M4 20V4M4 20h16"/><rect x="7" y="12" width="3" height="5"/><rect x="12" y="8" width="3" height="9"/><rect x="17" y="5" width="3" height="12"/>'),
 'shield':_svg('<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>'),
 'box':_svg('<path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>'),
 'cart':_svg('<circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4h2l2.4 12h10l2-8H6"/>'),
 'pill':_svg('<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(45 12 12)"/><path d="M9 9l6 6"/>'),
 'film':_svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M8 5v14M16 5v14"/>'),
 'plane':_svg('<path d="M3 13l18-7-4 15-4-6z"/><path d="M13 15l-3 4"/>'),
 'fork':_svg('<path d="M7 3v8a2 2 0 0 0 4 0V3M9 11v10"/><path d="M16 3c-1.5 0-2 2-2 4s.5 4 2 4v10"/>'),
 'doc':_svg('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/>'),
}
def get_icon(key): return ICON.get(key, ICON['doc'])

def chev_r(cx, cy, col="#b8202e", sw="2.4", s=7):
    return f'<path d="M{cx-4} {cy-s} L{cx+4} {cy} L{cx-4} {cy+s}" fill="none" stroke="{col}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"/>'
def chev_d(cx, cy, col="#b8202e", sw="2.4", s=7):
    return f'<path d="M{cx-s} {cy-4} L{cx} {cy+4} L{cx+s} {cy-4}" fill="none" stroke="{col}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"/>'

# ---------------- 日本語の自然な折り返し ----------------
def wrap_label(text, max_chars):
    """max_chars に収まれば1行。収まらなければ「・（/、」など自然な位置で改行。
    機械的な中央分割で語の途中で切れるのを避けるための処理。"""
    if len(text) <= max_chars:
        return [text]
    best = None
    for i, c in enumerate(text):
        cut = i + 1
        if cut <= max_chars and cut < len(text) and c in '・/／、，':
            best = cut
        if c == '（' and 0 < i <= max_chars:
            best = i
    if best is None:
        best = max_chars
    line1, line2 = text[:best], text[best:]
    if len(line2) > max_chars:
        return [line1, line2[:max_chars], line2[max_chars:]]
    return [line1, line2]

# ================= プロセス図（inline SVG） =================
# weasyprint は table の自動レイアウトやネストflexで崩れ/ハングするため、
# プロセス図は必ず SVG で描く。これにより順番・矢印・改行を完全に制御できる。
W = 1168
def process_svg(groups, layout):
    P = []
    if layout == 'lanes':
        chip_h=58; gap=30; row_gap=26; lblw=88; stepx=102
        rows_y=[i*(chip_h+row_gap) for i in range(len(groups))]
        H=rows_y[-1]+chip_h
        P.append(f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" font-family=\'{FONT}\' width="100%">')
        for gi,g in enumerate(groups):
            ry=rows_y[gi]; steps=g['steps']; nst=len(steps); acc=g.get('accent','#b8202e')
            chipw=(W-stepx-(nst-1)*gap)/nst
            xs=[stepx+i*(chipw+gap) for i in range(nst)]
            P.append(f'<rect x="0" y="{ry}" width="{lblw}" height="{chip_h}" rx="4" fill="#f7f8fa"/>')
            P.append(f'<rect x="0" y="{ry}" width="4" height="{chip_h}" rx="2" fill="{acc}"/>')
            lines=g.get('label','').split('|')
            ly=ry+chip_h/2-(len(lines)-1)*9+5
            for k,ll in enumerate(lines):
                P.append(f'<text x="{lblw/2}" y="{ly+k*18}" text-anchor="middle" font-size="13.5" font-weight="700" fill="#15233f">{esc(ll)}</text>')
            maxc=max(6,int((chipw-26)/13))
            for ci,st in enumerate(steps):
                num,label,hot=st
                x=xs[ci]
                fill='#fbeced' if hot else '#ffffff'; stroke='#eccacd' if hot else '#e3e7ee'
                ncol='#b8202e' if hot else '#6b7688'; tcol='#8f1822' if hot else '#1f2a3d'; tw='700' if hot else '600'
                P.append(f'<rect x="{x}" y="{ry}" width="{chipw}" height="{chip_h}" rx="7" fill="{fill}" stroke="{stroke}" stroke-width="1"/>')
                P.append(f'<text x="{x+14}" y="{ry+21}" font-size="12.5" font-weight="800" fill="{ncol}">{esc(num)}</text>')
                wl=wrap_label(label,maxc); fs=13.5 if len(wl)<=1 else 12.5
                if len(wl)==1:
                    P.append(f'<text x="{x+14}" y="{ry+42}" font-size="{fs}" font-weight="{tw}" fill="{tcol}">{esc(wl[0])}</text>')
                else:
                    for li,ln in enumerate(wl[:2]):
                        P.append(f'<text x="{x+14}" y="{ry+38+li*15}" font-size="{fs}" font-weight="{tw}" fill="{tcol}">{esc(ln)}</text>')
                if ci<nst-1:
                    P.append(chev_r(x+chipw+gap/2, ry+chip_h/2))
            if gi<len(groups)-1:
                P.append(chev_d(xs[0]+30, ry+chip_h+row_gap/2))
        P.append('</svg>')
        return ''.join(P), H
    # phases (columns)
    ncol=len(groups); colgap=24
    colw=(W-(ncol-1)*colgap)/ncol
    xs=[i*(colw+colgap) for i in range(ncol)]
    hdr_h=34; step_gap=10; card_h=46
    maxsteps=max(len(g['steps']) for g in groups)
    H=hdr_h+14+maxsteps*card_h+(maxsteps-1)*step_gap
    maxc=max(8,int((colw-24)/12.5))
    P.append(f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" font-family=\'{FONT}\' width="100%">')
    for gi,g in enumerate(groups):
        x=xs[gi]
        P.append(f'<rect x="{x}" y="0" width="{colw}" height="{hdr_h}" rx="5" fill="#15233f"/>')
        P.append(f'<text x="{x+colw/2}" y="{hdr_h/2+5}" text-anchor="middle" font-size="14" font-weight="700" fill="#ffffff">{esc(g.get("label",""))}</text>')
        if gi<ncol-1:
            P.append(chev_r(x+colw+colgap/2, hdr_h/2))
        sy0=hdr_h+14
        for si,st in enumerate(g['steps']):
            num,label,hot=st
            sy=sy0+si*(card_h+step_gap)
            fill='#fbeced' if hot else '#ffffff'; stroke='#eccacd' if hot else '#e3e7ee'
            ncl='#b8202e' if hot else '#6b7688'; tcol='#8f1822' if hot else '#1f2a3d'; tw='700' if hot else '600'
            P.append(f'<rect x="{x}" y="{sy}" width="{colw}" height="{card_h}" rx="7" fill="{fill}" stroke="{stroke}" stroke-width="1"/>')
            P.append(f'<circle cx="{x+18}" cy="{sy+card_h/2}" r="11" fill="none" stroke="{ncl}" stroke-width="1.4"/>')
            P.append(f'<text x="{x+18}" y="{sy+card_h/2+4}" text-anchor="middle" font-size="11" font-weight="800" fill="{ncl}">{esc(num)}</text>')
            wl=wrap_label(label,maxc); tx=x+36
            if len(wl)==1:
                P.append(f'<text x="{tx}" y="{sy+card_h/2+4.5}" font-size="12.5" font-weight="{tw}" fill="{tcol}">{esc(wl[0])}</text>')
            else:
                P.append(f'<text x="{tx}" y="{sy+card_h/2-3}" font-size="11.5" font-weight="{tw}" fill="{tcol}">{esc(wl[0])}</text>')
                P.append(f'<text x="{tx}" y="{sy+card_h/2+12}" font-size="11.5" font-weight="{tw}" fill="{tcol}">{esc(wl[1])}</text>')
            if si<len(g['steps'])-1:
                P.append(chev_d(x+18, sy+card_h+step_gap/2, s=5, sw="2"))
    P.append('</svg>')
    return ''.join(P), H

# ---------------- CSS ----------------
CSS = """
  @page { size: 1280px 720px; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  :root{ --navy:#15233f; --ink:#1f2a3d; --red:#b8202e; --red-soft:#fbeced;
    --line:#e3e7ee; --gray:#6b7688; --bg-card:#f7f8fa; }
  html,body{ font-family:"IPAexGothic","Noto Sans JP",sans-serif; color:var(--ink); }
  .slide{ position:relative; width:1280px; height:720px; background:#fff; padding:44px 56px; page-break-after:always; overflow:hidden; }
  .logo{ position:absolute; top:44px; right:56px; height:30px; width:auto; opacity:.92; }
  .head{ display:table; width:100%; }
  .head .bar{ display:table-cell; width:6px; vertical-align:top; }
  .head .bar i{ display:block; width:6px; height:52px; background:var(--red); border-radius:3px; }
  .head .titles{ display:table-cell; vertical-align:top; padding-left:18px; }
  .kicker{ font-size:13px; font-weight:700; color:var(--gray); letter-spacing:.16em; }
  .title{ font-size:31px; font-weight:700; color:var(--navy); line-height:1.25; margin-top:7px; }
  .title .tag{ color:var(--red); }
  .lead2{ margin-top:16px; font-size:14.5px; line-height:1.7; color:var(--ink); }
  .lead2 .li{ display:block; padding-left:20px; position:relative; }
  .lead2 .li:before{ content:""; position:absolute; left:2px; top:10px; width:7px; height:7px; background:var(--red); border-radius:50%; }
  .lead2 b{ color:var(--red); font-weight:700; }
  .flow{ margin-top:20px; }
  .chal{ display:table; width:100%; border-spacing:16px 0; margin:22px -16px 0; }
  .chal .c{ display:table-cell; vertical-align:top; background:var(--bg-card); border-top:3px solid var(--red); border-radius:8px; padding:14px 14px 16px; }
  .chal .c .ch{ font-size:14px; font-weight:800; color:var(--navy); margin-bottom:8px; line-height:1.35; }
  .chal .c .ch svg{ width:18px; height:18px; vertical-align:-3px; margin-right:7px; color:var(--red); }
  .chal .c .cb{ font-size:12.5px; color:var(--ink); line-height:1.55; }
  .foot{ position:absolute; left:56px; right:56px; bottom:30px; display:table; width:1168px; padding-top:13px; border-top:1px solid var(--line); }
  .foot .brand{ display:table-cell; text-align:left; font-size:13px; font-weight:700; color:var(--navy); letter-spacing:.04em; }
  .foot .copy{ display:table-cell; text-align:center; font-size:11px; color:var(--gray); }
  .foot .pageno{ display:table-cell; text-align:right; font-size:12px; color:var(--gray); font-weight:700; }
"""
COPY = '© WriteUpCompany, Inc. All Rights Reserved.'
BRAND = '株式会社ライトアップ'

def process_page(data, logo, pageno=None):
    """data: dict(cat, title, leads[2], layout, groups[(label,[(num,text)..])..], hot[..], challenges[{t,b,icon}..])"""
    hot = set(data.get('hot', []))
    groups = [{'label': lab, 'steps': [(n, t, (n in hot)) for n, t in steps]} for lab, steps in data['groups']]
    svg, _ = process_svg(groups, data.get('layout', 'phases'))
    leads = ''.join(f'<span class="li">{l}</span>' for l in data['leads'])
    chs = data['challenges']
    cw = 'width:25%;' if len(chs) == 4 else 'width:33.33%;'
    chal = ''.join(f'<div class="c" style="{cw}"><div class="ch">{get_icon(c.get("icon","doc"))}{esc(c["t"])}</div>'
                   f'<div class="cb">{esc(c["b"])}</div></div>' for c in chs)
    pg = '' if pageno is None else esc(pageno)
    return f'''<div class="slide">
  <img class="logo" src="{logo}" alt="Writeup!">
  <div class="head"><div class="bar"><i></i></div><div class="titles">
    <div class="kicker">{esc(data["cat"])}</div>
    <div class="title"><span class="tag">【{esc(data["title"])}】</span>業務プロセスと課題</div></div></div>
  <div class="lead2">{leads}</div>
  <div class="flow">{svg}</div>
  <div class="chal">{chal}</div>
  <div class="foot"><div class="brand">{BRAND}</div><div class="copy">{COPY}</div><div class="pageno">{pg}</div></div>
</div>'''

def build_html(pages):
    logo = logo_uri()
    body = ''.join(process_page(p, logo, p.get('pageno')) for p in pages)
    return ('<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><style>'
            + CSS + '</style></head><body>' + body + '</body></html>')
