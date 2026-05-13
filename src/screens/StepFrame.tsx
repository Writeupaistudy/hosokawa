import type { ReactNode } from "react";

interface Props {
  level: 1 | 2 | 3;
  total?: number;
  title: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}

export function StepFrame({ level, total = 3, title, required, hint, children }: Props) {
  const progress = (level / total) * 100;
  return (
    <section className="pixel-frame p-5 sm:p-7 animate-pop">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="font-pixel text-sm text-bird-deep">
          LV.{level} / {total}
        </span>
        {required ? (
          <span className="chip" style={{ background: "#ff6fa3", borderColor: "#ff6fa3", color: "#0b1b4d" }}>
            必須
          </span>
        ) : (
          <span className="chip" style={{ background: "#5ee27a", borderColor: "#5ee27a", color: "#0b1b4d" }}>
            任意・スキップOK
          </span>
        )}
      </div>

      <div className="progress-track mb-4">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <h2 className="font-pixel text-lg sm:text-xl">{title}</h2>
      {hint && <p className="mt-1 text-xs text-bird-deep/70">{hint}</p>}

      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}
