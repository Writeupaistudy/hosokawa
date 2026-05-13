import type { FormState, ShareKnowhow } from "../types";
import { StepFrame } from "./StepFrame";

interface Props {
  form: FormState;
  setQuestion: (v: string) => void;
  setShareKnowhow: (v: ShareKnowhow) => void;
  setKnowhowContent: (v: string) => void;
  onFinish: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const SHARE: { value: ShareKnowhow; emoji: string; label: string; note: string }[] = [
  { value: "ok-live", emoji: "🎤", label: "当日コメントで発表OK", note: "司会が拾います" },
  { value: "ok-share", emoji: "📣", label: "紹介してくれるならOK", note: "代弁で紹介します" },
  { value: "ng", emoji: "🤫", label: "今回はパス", note: "聞き専で参加" },
];

export function Step3({
  form,
  setQuestion,
  setShareKnowhow,
  setKnowhowContent,
  onFinish,
  onBack,
  onSkip,
}: Props) {
  return (
    <StepFrame
      level={3}
      title="質問 & ノウハウのおすそ分け"
      hint="あなたの一言がBird全体の知見に。1問だけでもOK。"
    >
      <div>
        <label className="block text-sm font-bold mb-1">
          事前に聞きたい質問 <span className="text-xs font-normal text-bird-deep/60">（任意）</span>
        </label>
        <textarea
          className="pixel-input min-h-[70px]"
          placeholder="例：Chatwork MCPの初期設定でハマりがちなポイントは？"
          value={form.question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-bold mb-2">
          自分のノウハウの共有について
        </label>
        <div className="grid sm:grid-cols-3 gap-2">
          {SHARE.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`option-card ${form.shareKnowhow === opt.value ? "selected" : ""}`}
              onClick={() => setShareKnowhow(opt.value)}
            >
              <span className="text-2xl">{opt.emoji}</span>
              <span className="text-left">
                <b className="block text-sm">{opt.label}</b>
                <span className="text-[11px]">{opt.note}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {(form.shareKnowhow === "ok-live" || form.shareKnowhow === "ok-share") && (
        <div className="animate-pop">
          <label className="block text-sm font-bold mb-1">
            ノウハウの内容（キーワードだけでOK）
          </label>
          <textarea
            className="pixel-input min-h-[70px]"
            placeholder="例：Notionの議事録テンプレに直接書かせる流れ / 提案書はClaudeに章立て→人がリライト"
            value={form.knowhowContent}
            onChange={(e) => setKnowhowContent(e.target.value)}
          />
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button className="pixel-btn pixel-btn-secondary" onClick={onBack}>
          ← 戻る
        </button>
        <button className="pixel-btn pixel-btn-secondary" onClick={onSkip}>
          スキップして完了 »
        </button>
        <button className="pixel-btn flex-1" onClick={onFinish}>
          ✨ 送信して特典GET
        </button>
      </div>
    </StepFrame>
  );
}
