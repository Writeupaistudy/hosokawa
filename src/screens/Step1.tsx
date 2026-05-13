import type { FormState, Attendance } from "../types";
import { StepFrame } from "./StepFrame";

interface Props {
  form: FormState;
  setName: (v: string) => void;
  setBirdName: (v: string) => void;
  setAttendance: (v: Attendance) => void;
  onNext: () => void;
  onBack: () => void;
}

const ATTEND_OPTIONS: { value: Attendance; emoji: string; label: string; note: string }[] = [
  { value: "live", emoji: "🎤", label: "リアル参加する", note: "5/14 木 19:00-20:00" },
  { value: "archive", emoji: "🎞️", label: "アーカイブで観る", note: "当日NGでも後で視聴OK" },
  { value: "skip", emoji: "🙇", label: "今回は不参加", note: "次回をお楽しみに" },
];

export function Step1({ form, setName, setBirdName, setAttendance, onNext, onBack }: Props) {
  const canNext = form.name.trim() !== "" && form.attendance !== "";

  return (
    <StepFrame level={1} title="まずは自己紹介！" required hint="ここだけ必須。30秒で終わります。">
      <div>
        <label className="block text-sm font-bold mb-1">お名前</label>
        <input
          className="pixel-input"
          placeholder="例：細川みなみ"
          value={form.name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-bold mb-1">Bird名 / 担当案件（任意）</label>
        <input
          className="pixel-input"
          placeholder="例：チェストラボ案件 担当"
          value={form.birdName}
          onChange={(e) => setBirdName(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-bold mb-2">参加の意思</label>
        <div className="grid sm:grid-cols-3 gap-2">
          {ATTEND_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`option-card ${form.attendance === opt.value ? "selected" : ""}`}
              onClick={() => setAttendance(opt.value)}
            >
              <span className="text-2xl">{opt.emoji}</span>
              <span className="text-left">
                <b className="block">{opt.label}</b>
                <span className="text-[11px]">{opt.note}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button className="pixel-btn pixel-btn-secondary" onClick={onBack}>
          ← 戻る
        </button>
        <button className="pixel-btn flex-1" onClick={onNext} disabled={!canNext}>
          次へ ▶
        </button>
      </div>
    </StepFrame>
  );
}
