// Line icons (Lucide shapes, same set Proflo uses). `filled` adds a soft fill for the active tab.
type P = { size?: number; strokeWidth?: number; filled?: boolean };

const svg = (size: number, sw: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: sw,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

const soft = { fill: 'currentColor', fillOpacity: 0.16 };

export const IconHome = ({ size = 26, strokeWidth = 2, filled }: P) => (
  <svg {...svg(size, strokeWidth)}>
    <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
    <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" {...(filled ? soft : {})} />
  </svg>
);
export const IconChart = ({ size = 26, strokeWidth = 2, filled }: P) => (
  <svg {...svg(size, strokeWidth)}>
    <path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z" {...(filled ? soft : {})} />
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
  </svg>
);
export const IconList = ({ size = 26, strokeWidth = 2, filled }: P) => (
  <svg {...svg(size, strokeWidth)}>
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" {...(filled ? soft : {})} />
    <path d="M14 8H8M16 12H8M13 16H8" />
  </svg>
);
export const IconSettings = ({ size = 22, strokeWidth = 2 }: P) => (
  <svg {...svg(size, strokeWidth)}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
export const IconEye = ({ size = 20, strokeWidth = 2 }: P) => (
  <svg {...svg(size, strokeWidth)}>
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
export const IconEyeOff = ({ size = 20, strokeWidth = 2 }: P) => (
  <svg {...svg(size, strokeWidth)}>
    <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49M14.084 14.158a3 3 0 0 1-4.242-4.242M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143M2 2l20 20" />
  </svg>
);
export const IconBack = ({ size = 22, strokeWidth = 2.2 }: P) => (
  <svg {...svg(size, strokeWidth)}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);
export const IconNext = ({ size = 18, strokeWidth = 2.2 }: P) => (
  <svg {...svg(size, strokeWidth)}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);
export const IconPlus = ({ size = 26, strokeWidth = 2.6 }: P) => (
  <svg {...svg(size, strokeWidth)}>
    <path d="M5 12h14M12 5v14" />
  </svg>
);
export const IconMinus = ({ size = 26, strokeWidth = 2.6 }: P) => (
  <svg {...svg(size, strokeWidth)}>
    <path d="M5 12h14" />
  </svg>
);
export const IconBackspace = ({ size = 24, strokeWidth = 1.9 }: P) => (
  <svg {...svg(size, strokeWidth)}>
    <path d="M10 5a2 2 0 0 0-1.344.519l-6.328 5.74a1 1 0 0 0 0 1.481l6.328 5.741A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zM12 9l6 6M18 9l-6 6" />
  </svg>
);
export const IconCalendar = ({ size = 17, strokeWidth = 2 }: P) => (
  <svg {...svg(size, strokeWidth)}>
    <path d="M8 2v4M16 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
  </svg>
);
export const IconWallet = ({ size = 16, strokeWidth = 2 }: P) => (
  <svg {...svg(size, strokeWidth)}>
    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
  </svg>
);
export const IconUp = ({ size = 16, strokeWidth = 2.2 }: P) => (
  <svg {...svg(size, strokeWidth)}>
    <path d="m18 15-6-6-6 6" />
  </svg>
);
export const IconDown = ({ size = 16, strokeWidth = 2.2 }: P) => (
  <svg {...svg(size, strokeWidth)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
export const IconSearch = ({ size = 18, strokeWidth = 2 }: P) => (
  <svg {...svg(size, strokeWidth)}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);
export const IconX = ({ size = 16, strokeWidth = 2.2 }: P) => (
  <svg {...svg(size, strokeWidth)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
export const IconLayers = ({ size = 20, strokeWidth = 2 }: P) => (
  <svg {...svg(size, strokeWidth)}>
    <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
    <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
    <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
  </svg>
);
export const IconDatabase = ({ size = 20, strokeWidth = 2 }: P) => (
  <svg {...svg(size, strokeWidth)}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14a9 3 0 0 0 18 0V5" />
    <path d="M3 12a9 3 0 0 0 18 0" />
  </svg>
);
export const IconInfo = ({ size = 20, strokeWidth = 2 }: P) => (
  <svg {...svg(size, strokeWidth)}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);
export const IconTag = ({ size = 20, strokeWidth = 2 }: P) => (
  <svg {...svg(size, strokeWidth)}>
    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
    <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
  </svg>
);
export const IconCheck = ({ size = 16, strokeWidth = 2.6 }: P) => (
  <svg {...svg(size, strokeWidth)}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
