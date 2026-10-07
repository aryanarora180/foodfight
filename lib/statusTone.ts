export type Tone = "done" | "voting" | "waiting" | "away";

// Shared by the people panel and the sidebar status chip so a status looks
// the same everywhere it appears.
export const TONE_STYLES: Record<
  Tone,
  { tile: string; dot: string; text: string; avatar: string }
> = {
  done: {
    tile: "border-win/30 bg-win/10",
    dot: "bg-win",
    text: "text-win",
    avatar: "border-win/70 bg-win/10 text-win",
  },
  voting: {
    tile: "border-sky/25 bg-sky/5",
    dot: "bg-sky",
    text: "text-sky/80",
    avatar: "border-sky/60 bg-sky/10 text-sky",
  },
  waiting: {
    tile: "border-white/10 bg-white/5",
    dot: "bg-white/25",
    text: "text-white/40",
    avatar: "border-white/25 bg-white/5 text-white/80",
  },
  away: {
    tile: "border-white/5 bg-white/[0.03] opacity-60",
    dot: "bg-white/20",
    text: "text-white/30",
    avatar: "border-white/10 bg-white/[0.03] text-white/40",
  },
};
