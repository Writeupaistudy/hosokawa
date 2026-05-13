import type { FormState } from "./types";
import type { Diagnosis } from "./diagnosis";

const GAS_ENDPOINT = (import.meta.env.VITE_GAS_ENDPOINT as string | undefined) ?? "";

export async function submitToSheet(form: FormState, diagnosis: Diagnosis) {
  if (!GAS_ENDPOINT) {
    console.warn(
      "VITE_GAS_ENDPOINT 未設定。送信先URLが入るまではコンソール出力のみ。",
      { form, diagnosis },
    );
    return { ok: false, reason: "no-endpoint" as const };
  }

  const payload = {
    timestamp: new Date().toISOString(),
    name: form.name,
    birdName: form.birdName,
    attendance: form.attendance,
    claudeUsage: form.claudeUsage,
    concern: form.concern,
    question: form.question,
    shareKnowhow: form.shareKnowhow,
    knowhowContent: form.knowhowContent,
    diagnosisCode: diagnosis.code,
    diagnosisTitle: diagnosis.title,
  };

  try {
    // GAS Web App は text/plain で送るとプリフライトを回避できる
    await fetch(GAS_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    return { ok: true as const };
  } catch (e) {
    console.error("submit failed", e);
    return { ok: false as const, reason: "fetch-failed" as const };
  }
}
