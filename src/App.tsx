import { useMemo, useState } from "react";
import type { FormState, Attendance, ClaudeUsage, ShareKnowhow } from "./types";
import { initialForm } from "./types";
import { diagnose } from "./diagnosis";
import { submitToSheet } from "./submit";
import { Start } from "./screens/Start";
import { Step1 } from "./screens/Step1";
import { Step2 } from "./screens/Step2";
import { Step3 } from "./screens/Step3";
import { Result } from "./screens/Result";

type Screen = "start" | "s1" | "s2" | "s3" | "result";

export default function App() {
  const [screen, setScreen] = useState<Screen>("start");
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitted, setSubmitted] = useState(false);

  const diagnosis = useMemo(() => diagnose(form), [form]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  async function finish() {
    setScreen("result");
    if (!submitted) {
      setSubmitted(true);
      await submitToSheet(form, diagnosis);
    }
  }

  return (
    <div className="min-h-full bg-starsky">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <Header />

        {screen === "start" && <Start onStart={() => setScreen("s1")} />}

        {screen === "s1" && (
          <Step1
            form={form}
            setAttendance={(v: Attendance) => update("attendance", v)}
            setName={(v) => update("name", v)}
            setBirdName={(v) => update("birdName", v)}
            onNext={() => setScreen("s2")}
            onBack={() => setScreen("start")}
          />
        )}

        {screen === "s2" && (
          <Step2
            form={form}
            setClaudeUsage={(v: ClaudeUsage) => update("claudeUsage", v)}
            setConcern={(v) => update("concern", v)}
            onNext={() => setScreen("s3")}
            onBack={() => setScreen("s1")}
            onSkip={() => setScreen("s3")}
          />
        )}

        {screen === "s3" && (
          <Step3
            form={form}
            setQuestion={(v) => update("question", v)}
            setShareKnowhow={(v: ShareKnowhow) => update("shareKnowhow", v)}
            setKnowhowContent={(v) => update("knowhowContent", v)}
            onFinish={finish}
            onBack={() => setScreen("s2")}
            onSkip={finish}
          />
        )}

        {screen === "result" && (
          <Result
            form={form}
            diagnosis={diagnosis}
            onRestart={() => {
              setForm(initialForm);
              setSubmitted(false);
              setScreen("start");
            }}
          />
        )}

        <Footer />
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="mb-6 text-center">
      <div className="inline-flex items-center gap-2">
        <span className="chip">第1回 / Bird勉強会</span>
        <span className="chip" style={{ background: "#ff6fa3", borderColor: "#ff6fa3", color: "#0b1b4d" }}>
          5/14 THU 19:00-20:00
        </span>
      </div>
      <h1 className="mt-3 font-pixel text-2xl sm:text-3xl text-white drop-shadow-[3px_3px_0_#0b1b4d]">
        🐦 参加表明クエスト
      </h1>
      <p className="mt-1 font-pixel text-bird-yellow text-sm">
        - Claude Code 案件運用ノウハウ 実践編 -
      </p>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-10 text-center text-[11px] text-white/60 font-pixel">
      <p>主催：ライトアップ（川上元・細川みなみ） / 講師：高橋 貢</p>
      <p className="mt-1">アーカイブ視聴予定者もぜひ事前質問を投げてください 🐤</p>
    </footer>
  );
}
