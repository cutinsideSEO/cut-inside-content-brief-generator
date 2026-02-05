export interface ClientColor {
  name: string;
  bg: string;
  text: string;
  border: string;
  icon: string;
  dot: string;
  light: string;
}

const CLIENT_COLORS: ClientColor[] = [
  { name: 'blue',    bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-200',    icon: 'text-blue-500',    dot: 'bg-blue-500',    light: 'bg-blue-100' },
  { name: 'violet',  bg: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-200',  icon: 'text-violet-500',  dot: 'bg-violet-500',  light: 'bg-violet-100' },
  { name: 'pink',    bg: 'bg-pink-50',    text: 'text-pink-600',    border: 'border-pink-200',    icon: 'text-pink-500',    dot: 'bg-pink-500',    light: 'bg-pink-100' },
  { name: 'orange',  bg: 'bg-orange-50',  text: 'text-orange-600',  border: 'border-orange-200',  icon: 'text-orange-500',  dot: 'bg-orange-500',  light: 'bg-orange-100' },
  { name: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', icon: 'text-emerald-500', dot: 'bg-emerald-500', light: 'bg-emerald-100' },
  { name: 'teal',    bg: 'bg-teal-50',    text: 'text-teal-600',    border: 'border-teal-200',    icon: 'text-teal-500',    dot: 'bg-teal-500',    light: 'bg-teal-100' },
  { name: 'amber',   bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200',   icon: 'text-amber-500',   dot: 'bg-amber-500',   light: 'bg-amber-100' },
  { name: 'rose',    bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-200',    icon: 'text-rose-500',    dot: 'bg-rose-500',    light: 'bg-rose-100' },
  { name: 'sky',     bg: 'bg-sky-50',     text: 'text-sky-600',     border: 'border-sky-200',     icon: 'text-sky-500',     dot: 'bg-sky-500',     light: 'bg-sky-100' },
  { name: 'green',   bg: 'bg-green-50',   text: 'text-green-600',   border: 'border-green-200',   icon: 'text-green-500',   dot: 'bg-green-500',   light: 'bg-green-100' },
];

export function getClientColor(index: number): ClientColor {
  return CLIENT_COLORS[index % CLIENT_COLORS.length];
}

export { CLIENT_COLORS };
