import type { FormState } from "./types";

export interface Diagnosis {
  code: string;
  title: string;
  emoji: string;
  catch: string;
  body: string;
  birdAdvice: string;
  rarity: "N" | "R" | "SR" | "SSR";
  color: string;
}

const DIAGNOSES: Record<string, Diagnosis> = {
  sage: {
    code: "SAGE",
    title: "情報集約の賢者バード",
    emoji: "🦉",
    catch: "MCPで案件のすべてを呑み込む者。",
    body: "毎日Claude Codeを使い倒し、ノウハウも惜しまず共有できる稀有な存在。あなたの一言が他のBirdの1週間を救うかも。",
    birdAdvice: "ウェビナーでぜひコメント発表を。あなたの実例こそが教材です。",
    rarity: "SSR",
    color: "#ffd24a",
  },
  scout: {
    code: "SCOUT",
    title: "デモ運用の斥候バード",
    emoji: "🦅",
    catch: "打ち合わせ中に作って見せる、最前線の使い手。",
    body: "ノウハウ②③の打ち合わせ運用と相性抜群。あなたの『お客様タイプ別の対応』は他のBirdの参考になります。",
    birdAdvice: "事前質問に具体的な案件シーンを書くと、デモがあなた向けにチューニングされるかも。",
    rarity: "SR",
    color: "#5ee27a",
  },
  explorer: {
    code: "EXPLORER",
    title: "好奇心の探検バード",
    emoji: "🐦",
    catch: "触り始めたばかり。だからこそ伸びしろMAX。",
    body: "Claude Codeを試し始めた段階のあなたは、ウェビナー後の伸び率が最も高いゾーン。明日からのアクションを1つだけ決めて帰ろう。",
    birdAdvice: "MCPの設定で迷ったら、特典のスクショ付きマニュアルから始めるのが最短ルート。",
    rarity: "R",
    color: "#7cd6ff",
  },
  hatchling: {
    code: "HATCHLING",
    title: "孵化したてのヒナバード",
    emoji: "🐣",
    catch: "まだ巣の中。でも明日羽ばたく予定。",
    body: "未利用 or これからのあなたへ。Maxプラン($100/月)に踏み切る前に、まずは特典の初期設定マニュアルで翼を整えよう。",
    birdAdvice: "ウェビナー中の質問はチャットでOK。『〇〇って何ですか？』レベルの質問が一番喜ばれます。",
    rarity: "N",
    color: "#ff6fa3",
  },
  archivist: {
    code: "ARCHIVIST",
    title: "夜明け前の録画派バード",
    emoji: "🌙",
    catch: "リアル参加できなくても、ちゃんと取りに行く。",
    body: "アーカイブ視聴予定のあなた。事前質問を投げ込んでおくと、本編で答えが拾われる可能性大。録画にも反映されます。",
    birdAdvice: "視聴後に『明日からの一歩』を1つ宣言して公式LINEへ。これだけで翌週が変わります。",
    rarity: "R",
    color: "#a78bfa",
  },
};

export function diagnose(f: FormState): Diagnosis {
  const sharing = f.shareKnowhow === "ok-live" || f.shareKnowhow === "ok-share";
  const heavy = f.claudeUsage === "daily" || f.claudeUsage === "weekly";

  if (f.attendance === "archive") return DIAGNOSES.archivist;
  if (sharing && heavy) return DIAGNOSES.sage;
  if (heavy) return DIAGNOSES.scout;
  if (f.claudeUsage === "tried") return DIAGNOSES.explorer;
  if (f.claudeUsage === "none" || f.claudeUsage === "") return DIAGNOSES.hatchling;
  return DIAGNOSES.explorer;
}
