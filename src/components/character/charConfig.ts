// 캐릭터 그림 (2.5등신). 설정값(CharConfig)으로 SVG 속 마크업을 만든다. 목업 home.html 의 charMarkup 을 옮긴 것
// 모든 값은 아래 목록에서 고른 것만 쓰고, 저장된 값도 sanitize 로 걸러서 그대로 innerHTML 에 넣어도 안전하다

export const SKINS: [string, string][] = [['#fff1e6', '#ffd8c2'], ['#ffe6cf', '#f4c39c'], ['#f1c69c', '#dca273'], ['#d49a70', '#b97c53'], ['#a56d4a', '#865436']];
export const EYE_COLORS = { brown: '#9a6048', black: '#4b4656', blue: '#3f86e0', green: '#34a070', purple: '#9464d6', amber: '#dc9a24' };

export interface CharConfig {
  gender: 'boy' | 'girl';
  skin: number;
  eyeShape: 'round' | 'big' | 'smile' | 'sleepy' | 'sharp';
  eyeColor: keyof typeof EYE_COLORS;
  nose: 'none' | 'dot' | 'button' | 'line';
  mouth: 'open' | 'smile' | 'cat' | 'o' | 'tongue' | 'grin';
}
export const DEFAULT_CFG: CharConfig = { gender: 'boy', skin: 0, eyeShape: 'round', eyeColor: 'brown', nose: 'none', mouth: 'open' };

// 꾸미기 탭: view 는 타일에 보여 줄 부분(viewBox), swatch 는 색 동그라미
export interface CustomTab {
  key: keyof CharConfig;
  label: string;
  view?: string;
  swatch?: (v: string | number) => string;
  opts: [string | number, string][];
}
export const CUSTOM_TABS: CustomTab[] = [
  { key: 'gender', label: '성별', view: '34 16 132 132', opts: [['boy', '남자'], ['girl', '여자']] },
  { key: 'skin', label: '피부', swatch: i => `linear-gradient(135deg,${SKINS[+i][0]},${SKINS[+i][1]})`,
    opts: [[0, '밝은'], [1, '아이보리'], [2, '베이지'], [3, '황갈색'], [4, '브라운']] },
  { key: 'eyeShape', label: '눈 모양', view: '56 72 88 52', opts: [['round', '동글'], ['big', '초롱'], ['smile', '웃음'], ['sleepy', '졸림'], ['sharp', '또렷']] },
  { key: 'eyeColor', label: '눈 색', swatch: c => `radial-gradient(circle at 35% 30%,#fff6 0 18%,transparent 20%),linear-gradient(#1f1520,${EYE_COLORS[c as CharConfig['eyeColor']]} 75%)`,
    opts: [['brown', '갈색'], ['black', '검정'], ['blue', '파랑'], ['green', '초록'], ['purple', '보라'], ['amber', '호박']] },
  { key: 'nose', label: '코', view: '80 90 40 28', opts: [['none', '없음'], ['dot', '점'], ['button', '동글'], ['line', '콧대']] },
  { key: 'mouth', label: '입', view: '78 97 44 30', opts: [['open', '활짝'], ['smile', '미소'], ['cat', '고양이'], ['o', '오'], ['tongue', '메롱'], ['grin', '씨익']] },
];

// 목록에 없는 값은 기본값으로 (localStorage 에서 읽은 값 검사)
export function sanitize(raw: unknown): CharConfig {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const cfg = { ...DEFAULT_CFG } as Record<string, unknown>;
  for (const t of CUSTOM_TABS) if (t.opts.some(([v]) => v === src[t.key])) cfg[t.key] = src[t.key];
  return cfg as unknown as CharConfig;
}

export const randomCfg = (): CharConfig =>
  Object.fromEntries(CUSTOM_TABS.map(t => [t.key, t.opts[Math.floor(Math.random() * t.opts.length)][0]])) as unknown as CharConfig;

const CFG_KEY = 'atlas.charCfg';
export function loadCfg(): CharConfig {
  try { return sanitize(JSON.parse(localStorage.getItem(CFG_KEY) || '{}')); } catch { return { ...DEFAULT_CFG }; }
}
export function saveCfg(cfg: CharConfig) {
  try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch { /* 저장 안 돼도 화면은 그대로 */ }
}

const LINE = '#3a2530';
function eyeMarkup(shape: CharConfig['eyeShape'], cx: number, flip: boolean, I: string, skin: string, girl: boolean) {
  const st = `fill="none" stroke="${LINE}" stroke-linecap="round" stroke-width`;
  const shapes = {
    round: `<ellipse rx="9" ry="11" fill="${I}"/><circle cx="3.5" cy="-5" r="3.6" fill="#fff"/><circle cx="-3" cy="5" r="1.7" fill="#fff"/><path d="M-11-7q11-9 22 0" ${st}="2.8"/>`,
    big: `<ellipse rx="11" ry="13" fill="${I}"/><circle cx="4" cy="-6" r="4.6" fill="#fff"/><circle cx="-4" cy="5" r="2.3" fill="#fff"/><circle cx="3.5" cy="7.5" r="1.1" fill="#fff"/><path d="M-13-8q13-11 26 0l3-3" ${st}="3"/>`,
    smile: `<path d="M-9 3q9-12 18 0" ${st}="3.2"/>`,
    sleepy: `<ellipse rx="9" ry="11" fill="${I}"/><circle cx="3" cy="2" r="2.6" fill="#fff"/><path d="M-12-13h24v12q-12 5-24 0z" fill="${skin}"/><path d="M-11-1q11 5 22 0" ${st}="2.8"/>`,
    sharp: `<path d="M-10 3Q-5-10 10-7Q8 9-10 3z" fill="${I}"/><circle cx="3" cy="-3" r="2.8" fill="#fff"/><path d="M-11 3Q-5-12 12-8" ${st}="2.8"/>`,
  };
  const lash = girl && shape !== 'smile' ? `<path d="M10.5-7.5l4-3.5M11.5-3.5l4.5-1" ${st}="2.2"/>` : '';
  return `<g transform="translate(${cx} 96)${flip ? ' scale(-1 1)' : ''}">${shapes[shape]}${lash}</g>`;
}
const NOSES = {
  none: '',
  dot: '<ellipse cx="100" cy="104" rx="1.7" ry="1.3" fill="#c98470" opacity=".8"/>',
  button: '<path d="M97.5 103.5q2.5 2.5 5 0" fill="none" stroke="#c98470" stroke-width="1.8" stroke-linecap="round"/>',
  line: '<path d="M101 98.5l-2.2 5.5h3.2" fill="none" stroke="#c98470" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
};
const MOUTHS = {
  open: `<path d="M94 110q6 8 12 0z" fill="#d9536b" stroke="${LINE}" stroke-width="2" stroke-linejoin="round"/><ellipse cx="100" cy="114" rx="2.6" ry="1.3" fill="#ff9aa8"/>`,
  smile: `<path d="M95 110q5 5 10 0" fill="none" stroke="${LINE}" stroke-width="2.2" stroke-linecap="round"/>`,
  cat: `<path d="M93 110q3.5 4 7 0q3.5 4 7 0" fill="none" stroke="${LINE}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  o: `<ellipse cx="100" cy="112" rx="3" ry="3.6" fill="#d9536b" stroke="${LINE}" stroke-width="2"/>`,
  tongue: `<path d="M101 111v3.5a2.5 2.5 0 0 0 5 0V111" fill="#ff8fa3" stroke="${LINE}" stroke-width="1.8"/><path d="M94 110.5q6 3 12 0" fill="none" stroke="${LINE}" stroke-width="2.2" stroke-linecap="round"/>`,
  grin: `<path d="M93 109h14q-1 7-7 7t-7-7z" fill="#fff" stroke="${LINE}" stroke-width="2" stroke-linejoin="round"/><path d="M94 111.5h12" stroke="${LINE}" stroke-width="1"/>`,
};

// p 는 그라데이션 id 접두사 (같은 화면에 여러 개 그리기 위해). war 이면 후드 색이 어둡고 머리띠를 두른다
export function charMarkup(cfg: CharConfig, p: string, { headOnly = false, war = false } = {}) {
  const [s1, s2] = SKINS[cfg.skin];
  const ec = EYE_COLORS[cfg.eyeColor];
  const girl = cfg.gender === 'girl';
  const [hood1, hood2, collar] = war ? ['#636a8c', '#3d4260', '#2f3350'] : ['#a495ff', '#7361ef', '#5f4fdc'];
  const S = `url(#${p}S)`, H = `url(#${p}H)`, HD = `url(#${p}D)`, I = `url(#${p}I)`;
  const defs = `<defs>
    <linearGradient id="${p}S" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s1}"/><stop offset="1" stop-color="${s2}"/></linearGradient>
    <linearGradient id="${p}H" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d523e"/><stop offset="1" stop-color="#4b2d24"/></linearGradient>
    <linearGradient id="${p}D" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hood1}"/><stop offset="1" stop-color="${hood2}"/></linearGradient>
    <linearGradient id="${p}I" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f1520"/><stop offset=".55" stop-color="${ec}" stop-opacity=".8"/><stop offset="1" stop-color="${ec}"/></linearGradient>
    <radialGradient id="${p}B"><stop offset="0" stop-color="#ff8fa8" stop-opacity="${girl ? .85 : .7}"/><stop offset="1" stop-color="#ff8fa8" stop-opacity="0"/></radialGradient>
  </defs>`;
  const body = headOnly ? '' : `<ellipse cx="100" cy="254" rx="46" ry="7" fill="${LINE}" opacity=".16"/>
  <g stroke="${LINE}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">
    <rect x="80" y="192" width="17" height="50" rx="8.5" fill="#434a7e"/><rect x="103" y="192" width="17" height="50" rx="8.5" fill="#434a7e"/>
    <ellipse cx="86" cy="245" rx="15" ry="8.5" fill="#fff"/><ellipse cx="114" cy="245" rx="15" ry="8.5" fill="#fff"/>
    <path d="M78 243q8-4 16 0M106 243q8-4 16 0" fill="none" stroke="#ff8fb1" stroke-width="2.2"/>
    <rect x="52" y="134" width="18" height="50" rx="9" fill="${HD}" transform="rotate(14 61 138)"/>
    <rect x="130" y="134" width="18" height="50" rx="9" fill="${HD}" transform="rotate(-14 139 138)"/>
    <circle cx="50" cy="184" r="9" fill="${S}"/><circle cx="150" cy="184" r="9" fill="${S}"/>
    <path d="M64 138c0-10 16-16 36-16s36 6 36 16v56c0 6-4 9-10 9H74c-6 0-10-3-10-9z" fill="${HD}"/>
    <ellipse cx="100" cy="128" rx="30" ry="9" fill="${collar}"/>
    <path d="M84 176h32a6 6 0 0 1 6 6v8a4 4 0 0 1-4 4H82a4 4 0 0 1-4-4v-8a6 6 0 0 1 6-6z" fill="#fff" fill-opacity=".16"/>
    <path d="M92 134v16M108 134v16" fill="none" stroke-width="2"/>
    <circle cx="92" cy="152" r="2.6" fill="#fff"/><circle cx="108" cy="152" r="2.6" fill="#fff"/>
  </g>`;
  const hairBack = girl
    ? `<path d="M40 88c0-34 26-56 60-56s60 22 60 56c0 22 3 42-4 56-8 5-18 3-22-5H66c-4 8-14 10-22 5-7-14-4-34-4-56z" fill="${H}"/>`
    : `<path d="M44 88c0-34 24-56 56-56s56 22 56 56c0 16-4 30-10 38H54c-6-8-10-22-10-38z" fill="${H}"/>`;
  const hairExtra = girl
    ? `<path d="M47 82c-5 16-5 32 0 46 5-2 9-9 9-18 0-11-3-20-9-28zM153 82c5 16 5 32 0 46-5-2-9-9-9-18 0-11 3-20 9-28z" fill="${H}"/>
       <g transform="translate(138 50) rotate(18)"><path d="M0 0l-11-7v14zM0 0l11-7v14z" fill="#ff7fa5"/><circle r="3.6" fill="#ff5d8f"/></g>`
    : `<path d="M100 33c-3-12 5-19 14-15-7 2-9 8-8 15" fill="${H}"/>`;
  const flipL = girl || cfg.eyeShape === 'big' || cfg.eyeShape === 'sharp';
  // 눈 깜빡임: animate-blink (globals.css). 웃는 눈은 깜빡이지 않는다
  const blink = cfg.eyeShape === 'smile' ? '' : ' class="animate-blink" style="transform-box:fill-box;transform-origin:center"';
  const head = `<g stroke="${LINE}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">
    ${hairBack}
    <circle cx="50" cy="94" r="8" fill="${S}"/><circle cx="150" cy="94" r="8" fill="${S}"/>
    <ellipse cx="100" cy="88" rx="50" ry="40" fill="${S}"/>
    <path d="M46 90C42 52 66 32 100 32s58 20 54 58c-6-12-14-20-24-24-2 8-10 12-20 10 4-6 3-11 0-14-8 10-22 14-36 12 3-5 3-9 1-12-12 5-20 12-24 18z" fill="${H}"/>
    ${hairExtra}
    <path d="M68 46c10-7 24-10 38-9" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="4"/>
  </g>
  <g${blink}>${eyeMarkup(cfg.eyeShape, 80, flipL, I, s1, girl)}${eyeMarkup(cfg.eyeShape, 120, false, I, s1, girl)}</g>
  <ellipse cx="65" cy="110" rx="10" ry="6" fill="url(#${p}B)"/><ellipse cx="135" cy="110" rx="10" ry="6" fill="url(#${p}B)"/>
  ${NOSES[cfg.nose]}${MOUTHS[cfg.mouth]}`;
  const band = headOnly || !war ? '' : `<g stroke="${LINE}" stroke-width="2.4" stroke-linejoin="round"><path d="M51 66Q100 44 149 66l-1 9Q100 54 52 75z" fill="#ff5d6c"/><path d="M147 68l16-8-3 12zM147 72l13 9-11 2z" fill="#ff5d6c"/></g>`;
  return defs + body + head + band;
}
