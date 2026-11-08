import { Sparkles, Egg, Flower2, Bird, Cloud, Flame, Flag, Sun, Flower, Medal, TreePine, type LucideIcon } from 'lucide-react';
import type { HolidayIconKey } from './holidays';

const ICONS: Record<HolidayIconKey, LucideIcon> = {
  fireworks: Sparkles,
  egg: Egg,
  flower: Flower2,
  dove: Bird,
  cloud: Cloud,
  flame: Flame,
  flag: Flag,
  sun: Sun,
  blossom: Flower,
  medal: Medal,
  tree: TreePine,
};

const EMOJI_FALLBACK: Record<HolidayIconKey, string> = {
  fireworks: '🎆', egg: '🐣', flower: '💐', dove: '🕊️', cloud: '☁️', flame: '🔥',
  flag: '🎇', sun: '🌹', blossom: '🕯️', medal: '🎖️', tree: '🎄',
};

export function HolidayIcon({ icon, className }: { icon: HolidayIconKey; className?: string }) {
  const Icon = ICONS[icon];
  if (!Icon) return <span className={className}>{EMOJI_FALLBACK[icon] ?? '🎉'}</span>;
  return <Icon className={className} />;
}