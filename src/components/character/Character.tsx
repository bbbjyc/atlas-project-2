import { AnimationEvent, CSSProperties } from 'react';
import { CharConfig, Equip, Slot, wornArt } from './charConfig';

// 캐릭터 그림 (2등신 동물). 머리·몸·팔·다리를 따로 그려서 팔만 휘두르는 식으로 움직일 수 있다
// 좌표는 200 x 240. 아이템(wear.svg)도 같은 좌표라 그대로 겹친다. 손에 드는 것은 손 가운데가 (0,0)
const OUT = '#6b3f33';   // 외곽선: 캐릭터와 아이템이 같은 색
const COLORS = {
  rabbit: { skin: '#fffaf0', accent: '#f6dc9c', cheek: '#f7c1cf' },
  sheep: { skin: '#fff6e6', accent: '#f7c5d2', cheek: '#f7c1cf' },
  bear: { skin: '#c8ddf5', accent: '#fff6e6', cheek: '#b9d0f5' },
  chick: { skin: '#fffaf0', accent: '#f6dc9c', cheek: '#f7c1cf' },
};
export type CharAnim = 'attack' | 'defend' | null;

// 슬롯에 입은 아이템 하나. 손에 드는 것은 손 자리로 옮겨 그린다
function Worn({ equip, slot, at }: { equip?: Equip; slot: Slot; at?: string }) {
  const name = equip?.[slot];
  const art = name ? wornArt(name) : null;
  if (!art) return null;
  return <use href={`/sprites/wear.svg#${art.id}`} style={art.style as CSSProperties} transform={at} />;
}

export default function Character({ cfg, equip, war = false, headOnly = false, anim = null, viewBox, className, onAnimationEnd }: {
  cfg: CharConfig; equip?: Equip; war?: boolean; headOnly?: boolean; anim?: CharAnim; viewBox?: string; className?: string;
  onAnimationEnd?: (e: AnimationEvent<SVGSVGElement>) => void;
}) {
  const sp = cfg.species;
  const c = COLORS[sp];
  const legFill = sp === 'rabbit' || sp === 'chick' ? c.accent : c.skin;

  const head = (
    <g className="c-part c-head">
      {/* 머리 뒤: 귀·털·새싹 */}
      {sp === 'rabbit' && <>
        <rect x="54" y="4" width="36" height="70" rx="18" fill={c.skin} /><rect x="110" y="4" width="36" height="70" rx="18" fill={c.skin} />
        <rect x="63" y="12" width="18" height="50" rx="9" fill={c.accent} stroke="none" /><rect x="119" y="12" width="18" height="50" rx="9" fill={c.accent} stroke="none" />
      </>}
      {sp === 'sheep' && <>
        <ellipse cx="40" cy="104" rx="15" ry="22" fill={c.accent} /><ellipse cx="160" cy="104" rx="15" ry="22" fill={c.accent} />
        <circle cx="50" cy="64" r="22" fill={c.skin} /><circle cx="150" cy="64" r="22" fill={c.skin} />
        <circle cx="74" cy="44" r="23" fill={c.skin} /><circle cx="126" cy="44" r="23" fill={c.skin} /><circle cx="100" cy="36" r="25" fill={c.skin} />
      </>}
      {sp === 'bear' && <><circle cx="54" cy="52" r="19" fill={c.skin} /><circle cx="146" cy="52" r="19" fill={c.skin} /></>}
      {sp === 'chick' && <>
        <path d="M100 46 V28" />
        <ellipse cx="85" cy="24" rx="15" ry="8" transform="rotate(-35 85 24)" fill="#cfe3a1" /><ellipse cx="115" cy="24" rx="15" ry="8" transform="rotate(35 115 24)" fill="#cfe3a1" />
      </>}
      {/* 얼굴 */}
      <rect x="38" y="44" width="124" height="102" rx="48" fill={c.skin} />
      {sp === 'rabbit' && <path d="M48 76 C56 44 144 44 152 76 C130 64 70 64 48 76 Z" fill={c.accent} stroke="none" />}
      {sp === 'sheep' && <path d="M96 62 c-4 -8 8 -11 7 -3 c-1 6 -10 5 -7 -3" fill="none" strokeWidth="3.5" />}
      <ellipse cx="68" cy="108" rx="11" ry="7.5" fill={c.cheek} stroke="none" /><ellipse cx="132" cy="108" rx="11" ry="7.5" fill={c.cheek} stroke="none" />
      <g className="animate-blink" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}><path d="M82 91 V101 M118 91 V101" /></g>
      {sp === 'chick'
        ? <path d="M92 104 H108 L100 113 Z" fill="#f1c35f" strokeWidth="3.5" />
        : <path d="M95 110 H105" />}
      {/* 전쟁모드 머리띠 (모자를 안 썼을 때만) */}
      {war && !equip?.head && <>
        <path d="M40 74 C70 62 130 62 160 74 L158 86 C130 74 70 74 42 86 Z" fill="#ff5d6c" />
        <path d="M158 78 L178 70 L174 84 Z M158 82 L176 94 L162 96 Z" fill="#ff5d6c" />
      </>}
      <Worn equip={equip} slot="face" />
      <Worn equip={equip} slot="head" />
    </g>
  );

  return (
    <svg viewBox={viewBox ?? (headOnly ? '28 0 144 150' : '0 0 200 240')} className={`${className ?? ''} ${anim ? `anim-${anim}` : ''}`}
      aria-hidden="true" onAnimationEnd={onAnimationEnd}
      fill="none" stroke={OUT} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" overflow="visible">
      {headOnly ? head : <>
        <ellipse cx="100" cy="230" rx="52" ry="7" fill={OUT} opacity=".14" stroke="none" />
        <Worn equip={equip} slot="back" />
        {/* 다리 */}
        <rect x="66" y="196" width="30" height="30" rx="13" fill={legFill} /><rect x="104" y="196" width="30" height="30" rx="13" fill={legFill} />
        <Worn equip={equip} slot="feet" />
        {/* 몸통 */}
        <g className="c-part c-body">
          <rect x="52" y="130" width="96" height="84" rx="34" fill={c.skin} />
          {sp === 'rabbit' && <path d="M60 170 C70 160 130 160 140 170 L146 212 C120 218 80 218 54 212 Z" fill={c.accent} stroke="none" />}
          {sp === 'sheep' && <path d="M112 176 C140 170 150 190 146 210 C130 216 112 212 108 198 Z" fill={c.accent} stroke="none" />}
          {sp === 'bear' && <ellipse cx="100" cy="182" rx="32" ry="26" fill={c.accent} stroke="none" />}
          <Worn equip={equip} slot="bottom" />
          <Worn equip={equip} slot="top" />
          <Worn equip={equip} slot="neck" />
        </g>
        {head}
        {/* 팔 (몸 앞에서 안으로 살짝 말린 손) */}
        <g className="c-part c-larm">
          <rect x="44" y="146" width="28" height="50" rx="14" fill={c.skin} /><path d="M56 190 c8 0 12 -6 10 -12" fill="none" strokeWidth="3.5" />
          <Worn equip={equip} slot="hands" at="translate(58 186)" />
          <Worn equip={equip} slot="leftHand" at="translate(58 186) rotate(10)" />
        </g>
        <g className="c-part c-rarm">
          <rect x="128" y="146" width="28" height="50" rx="14" fill={c.skin} /><path d="M144 190 c-8 0 -12 -6 -10 -12" fill="none" strokeWidth="3.5" />
          <Worn equip={equip} slot="hands" at="translate(142 186)" />
          <Worn equip={equip} slot="rightHand" at="translate(142 186) rotate(-15)" />
        </g>
      </>}
    </svg>
  );
}
