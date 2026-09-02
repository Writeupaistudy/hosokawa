#!/usr/bin/env bash
# 業務プロセス資料の生成に必要な環境を準備する（初回のみ実行すればよい）。
# - weasyprint（HTML→PDF。Chromium はサンドボックスでDL不可のため weasyprint を使う）
# - 日本語フォント IPAexGothic
# - 最小 fontconfig（フォント探索のハングを避ける）
set -u

# --- 1) weasyprint（単独で入れる。他パッケージのビルド失敗に巻き込まれないように） ---
python3 -c 'import weasyprint' 2>/dev/null \
  || pip install weasyprint --break-system-packages -q 2>&1 | tail -1
python3 -c 'import weasyprint; print("weasyprint:", weasyprint.__version__)' 2>/dev/null \
  || echo "WARN: weasyprint 未導入。render.py は HTML までは必ず出力する。"

# --- 2) 日本語フォント IPAexGothic ---
# 既にシステムに入っていれば何もしない → apt → pip(japanize-matplotlib) の順で試す。
if fc-list 2>/dev/null | grep -qi ipaexg; then
  echo "font: IPAexGothic already available"
elif apt-get install -y fonts-ipaexfont >/dev/null 2>&1 && fc-list 2>/dev/null | grep -qi ipaexg; then
  echo "font: IPAexGothic installed via apt"
else
  pip install japanize-matplotlib --break-system-packages -q >/dev/null 2>&1
  python3 - <<'PY' 2>/dev/null || echo "WARN: IPAexGothic を導入できず。既存の日本語フォントにフォールバックする。"
import os, glob, shutil, japanize_matplotlib
src = glob.glob(os.path.join(os.path.dirname(japanize_matplotlib.__file__), '**', 'ipaexg.ttf'), recursive=True)[0]
dst_dir = os.path.expanduser('~/.fonts'); os.makedirs(dst_dir, exist_ok=True)
shutil.copy(src, dst_dir)
print('font installed:', os.path.join(dst_dir, 'ipaexg.ttf'))
PY
  fc-cache -f ~/.fonts >/dev/null 2>&1 || true
fi

# --- 3) 最小 fontconfig（IPAexGothic のみを探索 → 高速・ハング回避） ---
# システムのフォントディレクトリも見るようにして、apt 導入分でも効くようにする。
mkdir -p ~/fcmin/cache ~/.fonts
cat > ~/fcmin/fonts.conf <<'EOF'
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>~/.fonts</dir>
  <dir>/usr/share/fonts/opentype/ipaexfont-gothic</dir>
  <dir>/usr/share/fonts/opentype/ipafont-gothic</dir>
  <cachedir>~/fcmin/cache</cachedir>
  <config></config>
</fontconfig>
EOF
FONTCONFIG_FILE=~/fcmin/fonts.conf fc-cache -f >/dev/null 2>&1 || true
echo "setup done"
