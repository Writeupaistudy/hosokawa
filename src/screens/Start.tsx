interface Props {
  onStart: () => void;
}

export function Start({ onStart }: Props) {
  return (
    <section className="pixel-frame p-5 sm:p-7 animate-pop">
      <div className="flex items-start gap-3">
        <div className="text-4xl sm:text-5xl animate-bob">🐦</div>
        <div>
          <h2 className="font-pixel text-xl sm:text-2xl">
            ようこそ、Bird よ。
            <span className="inline-block w-2 h-5 bg-bird-deep ml-1 animate-blink align-[-2px]" />
          </h2>
          <p className="mt-2 text-sm sm:text-base leading-relaxed">
            明日のウェビナーで、あなたの<b>1つのアクション</b>を増やすクエストへようこそ。
            <br />
            <b>3つのステップ / 約60秒</b>。
            必須は最初のステップだけ。残り2つはスキップOKです。
          </p>
        </div>
      </div>

      <ul className="mt-5 grid sm:grid-cols-2 gap-3 text-sm">
        <li className="option-card !cursor-default">
          <span className="text-xl">🎁</span>
          <span>
            <b className="block">回答者だけの特典①</b>
            Claude Code 初期設定 スクショ付きマニュアル
          </span>
        </li>
        <li className="option-card !cursor-default">
          <span className="text-xl">🔮</span>
          <span>
            <b className="block">回答者だけの特典②</b>
            おみくじ風 AI活用診断（5タイプ）
          </span>
        </li>
      </ul>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button className="pixel-btn flex-1" onClick={onStart}>
          ▶ クエスト開始
        </button>
        <a
          className="pixel-btn pixel-btn-secondary flex-1"
          href="#agenda"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("agenda")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          📜 アジェンダを見る
        </a>
      </div>

      <div id="agenda" className="mt-7 border-t-2 border-dashed border-bird-deep pt-4 text-sm leading-relaxed">
        <p className="font-bold">🗓 第1回 Bird向け勉強会</p>
        <p className="mt-1">
          テーマ：<b>「Claude Codeを使った案件運用ノウハウ ― 今日から使える実践編」</b>
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>ノウハウ① 案件のコンテキストをMCPでAIに集約させる（15分・実例デモ）</li>
          <li>ノウハウ② 文書系アウトプットの自動生成（議事録／提案書／アジェンダ／draw.io）</li>
          <li>ノウハウ③ 打ち合わせ運用とお客様タイプ別アプローチ</li>
          <li>Q&A → クロージング</li>
        </ul>
        <p className="mt-2 text-xs text-bird-deep/70">
          ※当日参加できない方のためにアーカイブも公開予定です。
        </p>
      </div>
    </section>
  );
}
