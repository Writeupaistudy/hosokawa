import type { FormState, ClaudeUsage } from "../types";
import { StepFrame } from "./StepFrame";

interface Props {
  form: FormState;
  setClaudeUsage: (v: ClaudeUsage) => void;
  setConcern: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const USAGE: { value: ClaudeUsage; emoji: string; label: string }[] = [
  { value: "none", emoji: "🐣", label: "まだ未利用" },
  { value: "tried", emoji: "🐤", label: "少し触った" },
  { value: "weekly", emoji: "🐦", label: "週数回" },
  { value: "daily", emoji: "🦅", label: "毎日ガッツリ" },
];

export function Step2({ form, setClaudeUsage, setConcern, onNext, onBack, onSkip }: Props) {
  return (
    <StepFrame
      level={2}
      title="今のあなたを少しだけ教えて"
      hint="講師の高橋さんが当日の深さを調整します。書かなくてもOK。"
    >
      <div>
        <label className="block text-sm font-bold mb-2">Claude Code の利用状況</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {USAGE.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`option-card flex-col text-center ${form.claudeUsage === opt.value ? "selected" : ""}`}
              onClick={() => setClaudeUsage(opt.value)}
            >
              <span className="text-2xl">{opt.emoji}</span>
              <span className="text-xs font-bold">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold mb-1">
          今、案件で抱えている悩み <span className="text-xs font-normal text-bird-deep/60">（任意・1行でOK）</span>
        </label>
        <textarea
          className="pixel-input min-h-[80px]"
          placeholder="例：議事録に毎回1時間かかる / お客様の温度差に困っている"
          value={form.concern}
          onChange={(e) => setConcern(e.target.value)}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button className="pixel-btn pixel-btn-secondary" onClick={onBack}>
          ← 戻る
        </button>
        <button className="pixel-btn pixel-btn-secondary" onClick={onSkip}>
          スキップ »
        </button>
        <button className="pixel-btn flex-1" onClick={onNext}>
          次へ ▶
        </button>
      </div>
    </StepFrame>
  );
}
