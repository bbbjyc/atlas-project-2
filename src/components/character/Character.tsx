import { AnimationEvent, CSSProperties, ReactNode } from 'react';
import { CharConfig, Equip, Slot, wornArt } from './charConfig';

// 캐릭터 그림 (2등신 동물). 머리에서 몸까지 선이 한 번에 이어지고, 귀·털도 그 선의 일부다
// 팔은 따로 그려서 팔만 휘두를 수 있다. 좌표는 200 x 240. 아이템(wear.svg)도 같은 좌표라 그대로 겹친다
// 몸 기준: 머리 30~170 x 34~140 / 몸통 48~152 x 140~218 / 발 68~98, 102~132 x 206~232
// 눈 (77,78) (123,78) · 손에 드는 것은 손 가운데가 (0,0): 왼손 (62,186), 오른손 (138,186)
const OUT = '#6e4034';   // 외곽선: 캐릭터와 아이템이 같은 색
const COLORS = {
  rabbit: { skin: '#fffcf5', accent: '#f6dc9c', cheek: '#f8c6d2' },
  sheep: { skin: '#fff8ea', accent: '#f8c9d6', cheek: '#f8c6d2' },
  bear: { skin: '#c9ddf5', accent: '#fff8ea', cheek: '#b4ccf0' },
  chick: { skin: '#fffcf5', accent: '#f6dc9c', cheek: '#f8c6d2' },
};
export type CharAnim = 'attack' | 'defend' | null;

// 머리(둥근 네모) + 목 + 몸통을 한 선으로. 머리가 몸보다 넓고 높다
const BODY = 'M58 140 C36 136 29 118 29 96 C29 54 58 34 100 34 C142 34 171 54 171 96 C171 118 164 136 142 140 C152 148 155 166 154 192 C153 212 140 218 100 218 C60 218 47 212 46 192 C45 166 48 148 58 140 Z';
// 팔: 몸 옆 가운데쯤에서 내려와 끝이 안쪽으로 살짝 말린다 (굵은 선 두 겹)
const ARM_L = 'M53 160 C45 172 46 186 58 190 C66 192 70 186 66 182';
const ARM_R = 'M147 160 C155 172 154 186 142 190 C134 192 130 186 134 182';

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
  const feetFill = sp === 'rabbit' || sp === 'chick' ? c.accent : c.skin;

  // 귀·털은 몸 선과 하나로 보이게: 선 있게 → 몸 → 선 없이 한 번 더 (몸 선이 귀 안을 가로지르지 않는다)
  const ears = (stroke: boolean): ReactNode => {
    const s = stroke ? undefined : 'none';
    if (sp === 'rabbit') return <><rect x="48" y="0" width="46" height="80" rx="23" fill={c.skin} stroke={s} /><rect x="106" y="0" width="46" height="80" rx="23" fill={c.skin} stroke={s} /></>;
    if (sp === 'bear') return <><circle cx="50" cy="46" r="20" fill={c.skin} stroke={s} /><circle cx="150" cy="46" r="20" fill={c.skin} stroke={s} /></>;
    if (sp === 'sheep') return <>
      {[[38, 84, 22], [52, 54, 22], [78, 36, 24], [100, 30, 22], [122, 36, 24], [148, 54, 22], [162, 84, 22]].map(([x, y, r]) => <circle key={x} cx={x} cy={y} r={r} fill={c.skin} stroke={s} />)}
    </>;
    return null;
  };

  const figure = (
    <>
      {sp === 'sheep' && <><ellipse cx="32" cy="112" rx="14" ry="22" fill={c.accent} /><ellipse cx="168" cy="112" rx="14" ry="22" fill={c.accent} /></>}
      {ears(true)}
      <path d={BODY} fill={c.skin} />
      {ears(false)}
      {/* 몸 무늬 */}
      {sp === 'rabbit' && <>
        <rect x="57" y="9" width="28" height="58" rx="14" fill={c.accent} stroke="none" /><rect x="115" y="9" width="28" height="58" rx="14" fill={c.accent} stroke="none" />
        <path d="M31 80 C33 50 60 36 100 36 C140 36 167 50 169 80 C150 68 128 64 100 64 C72 64 50 68 31 80 Z" fill={c.accent} stroke="none" />
        {!headOnly && <path d="M50 172 C70 160 130 160 150 172 L154 192 C153 212 140 218 100 218 C60 218 47 212 46 192 Z" fill={c.accent} stroke="none" />}
      </>}
      {sp === 'sheep' && <>
        <path d="M94 58 c-4 -9 9 -12 8 -3 c-1 7 -11 5 -8 -3" fill="none" strokeWidth="3" />
        {!headOnly && <path d="M108 184 C140 178 152 198 150 212 C130 218 108 214 104 198 Z" fill={c.accent} stroke="none" />}
      </>}
      {sp === 'bear' && !headOnly && <ellipse cx="100" cy="184" rx="32" ry="28" fill={c.accent} stroke="none" />}
      {sp === 'chick' && <>
        <path d="M100 36 V20" strokeWidth="3.6" />
        <ellipse cx="85" cy="16" rx="15" ry="8" transform="rotate(-32 85 16)" fill="#cfe3a1" /><ellipse cx="115" cy="16" rx="15" ry="8" transform="rotate(32 115 16)" fill="#cfe3a1" />
      </>}
      {/* 얼굴: 눈은 얼굴 위쪽, 볼은 크고 낮게 */}
      <ellipse cx="60" cy="106" rx="14" ry="9" fill={c.cheek} stroke="none" /><ellipse cx="140" cy="106" rx="14" ry="9" fill={c.cheek} stroke="none" />
      <g className="animate-blink" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}><path d="M77 70 V86 M123 70 V86" strokeWidth="3.4" /></g>
      {sp === 'chick'
        ? <path d="M93 86 H107 L100 95 Z" fill="#f1c35f" strokeWidth="2.8" />
        : <path d="M94 90 H106" strokeWidth="3.4" />}
      {/* 전쟁모드 머리띠 (모자를 안 썼을 때만) */}
      {war && !equip?.head && <>
        <path d="M31 60 C64 46 136 46 169 60 L167 72 C136 58 64 58 33 72 Z" fill="#ff5d6c" />
        <path d="M167 64 L187 56 L183 70 Z M167 68 L185 80 L171 82 Z" fill="#ff5d6c" />
      </>}
    </>
  );

  return (
    <svg viewBox={viewBox ?? (headOnly ? '22 -2 156 150' : '0 0 200 240')} className={`${className ?? ''} ${anim ? `anim-${anim}` : ''}`}
      aria-hidden="true" onAnimationEnd={onAnimationEnd}
      fill="none" stroke={OUT} strokeWidth="3.6" strokeLinejoin="round" strokeLinecap="round" overflow="visible">
      {headOnly ? <>{figure}<Worn equip={equip} slot="face" /><Worn equip={equip} slot="head" /></> : <>
        <ellipse cx="100" cy="232" rx="50" ry="6" fill={OUT} opacity=".14" stroke="none" />
        <Worn equip={equip} slot="back" />
        {/* 발 (몸 아래로 조금 보인다) */}
        <rect x="68" y="206" width="30" height="26" rx="12" fill={feetFill} /><rect x="102" y="206" width="30" height="26" rx="12" fill={feetFill} />
        <Worn equip={equip} slot="feet" />
        <g className="c-part c-body">
          {figure}
          <Worn equip={equip} slot="bottom" />
          <Worn equip={equip} slot="top" />
          <Worn equip={equip} slot="neck" />
          <Worn equip={equip} slot="face" />
          <Worn equip={equip} slot="head" />
        </g>
        {/* 팔 */}
        <g className="c-part c-larm">
          <path d={ARM_L} strokeWidth="16" /><path d={ARM_L} stroke={c.skin} strokeWidth="9.2" />
          <Worn equip={equip} slot="hands" at="translate(62 186)" />
          <Worn equip={equip} slot="leftHand" at="translate(62 186) rotate(10)" />
        </g>
        <g className="c-part c-rarm">
          <path d={ARM_R} strokeWidth="16" /><path d={ARM_R} stroke={c.skin} strokeWidth="9.2" />
          <Worn equip={equip} slot="hands" at="translate(138 186)" />
          <Worn equip={equip} slot="rightHand" at="translate(138 186) rotate(-15)" />
        </g>
      </>}
    </svg>
  );
}
