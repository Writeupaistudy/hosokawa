import type { FormState } from "../types";
import type { Diagnosis } from "../diagnosis";

interface Props {
  form: FormState;
  diagnosis: Diagnosis;
  onRestart: () => void;
}

const RARITY_LABEL: Record<Diagnosis["rarity"], string> = {
  N: "ノーマル",
  R: "レア",
  SR: "スーパーレア",
  SSR: "スーパースペシャルレア",
};

export function Result({ form, diagnosis, onRestart }: Props) {
  return (
    <section className="animate-pop">
      <div className="text-center mb-4">
        <p className="font-pixel text-bird-yellow text-sm animate-blink">
          ✨ クエスト クリア！ ✨
        </p>
        <h2 className="font-pixel text-2xl text-white mt-1 drop-shadow-[3px_3px_0_#0b1b4d]">
          {form.name || "Bird"} さんは…
        </h2>
      </div>

      <div
        className="pixel-frame p-5 sm:p-7 relative overflow-hidden"
        style={{ backgroundColor: diagnosis.color }}
      >
        <div className="absolute right-3 top-3 text-xl animate-sparkle">✨</div>
        <div className="absolute left-3 top-10 text-lg animate-sparkle">✨</div>

        <div className="flex items-start gap-3">
          <div className="text-5xl sm:text-6xl animate-bob">{diagnosis.emoji}</div>
          <div>
            <span className="chip">RARITY: {diagnosis.rarity} / {RARITY_LABEL[diagnosis.rarity]}</span>
            <h3 className="font-pixel text-xl sm:text-2xl mt-2">{diagnosis.title}</h3>
            <p className="mt-1 font-bold italic">「{diagnosis.catch}」</p>
          </div>
        </div>

        <p className="mt-4 leading-relaxed text-sm sm:text-base">{diagnosis.body}</p>

        <div className="mt-4 bg-white/80 border-2 border-bird-deep p-3">
          <p className="text-xs font-bold mb-1">📣 講師・運営からの一言</p>
          <p className="text-sm">{diagnosis.birdAdvice}</p>
        </div>
      </div>

      <div className="pixel-frame mt-5 p-5 sm:p-6">
        <h3 className="font-pixel text-lg">🎁 あなたの特典</h3>
        <p className="text-xs text-bird-deep/70 mt-1">
          ※マニュアルは当日朝までに本URLからDLできるようになります。
        </p>

        <ul className="mt-3 space-y-3 text-sm">
          <li className="option-card !cursor-default flex-col items-start">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📘</span>
              <b>Claude Code 初期設定マニュアル（スクショ付き）</b>
            </div>
            <p className="text-xs mt-1">
              「Claude Codeまだ触ってない…」でも当日一緒に作業できる状態まで持っていけるガイド。
            </p>
            <a
              className="pixel-btn pixel-btn-secondary mt-2 text-sm"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                alert("マニュアルは当日朝までにこのページから配布予定です 🐦");
              }}
            >
              ⬇ ダウンロード（準備中）
            </a>
          </li>

          <li className="option-card !cursor-default flex-col items-start">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔮</span>
              <b>あなたのAI活用診断：{diagnosis.title}</b>
            </div>
            <p className="text-xs mt-1">
              スクショして TL や チャットで Birdたちにシェア歓迎です。
            </p>
            <button
              className="pixel-btn pixel-btn-secondary mt-2 text-sm"
              onClick={() => {
                const text = `🐦 #AIバード 参加表明クエスト の結果\n\n${diagnosis.emoji} ${diagnosis.title}（${diagnosis.rarity}）\n「${diagnosis.catch}」\n\n明日19時、第1回Bird勉強会 行ってきます！`;
                navigator.clipboard?.writeText(text);
                alert("シェア文をコピーしました！");
              }}
            >
              📋 シェア文をコピー
            </button>
          </li>
        </ul>
      </div>

      <div className="pixel-frame mt-5 p-5 sm:p-6 text-sm">
        <p className="font-bold">📺 当日の参加方法</p>
        <p className="mt-1">
          Zoomリンクは事務局（細川）よりChatwork / 公式LINEで配布します。アーカイブを選んだ方には後日URLが届きます。
        </p>
      </div>

      <div className="text-center mt-6">
        <button className="pixel-btn pixel-btn-secondary" onClick={onRestart}>
          🔄 もう一度引き直す（送信は1回限り）
        </button>
      </div>
    </section>
  );
}
