import { AnimationEvent, CSSProperties, ReactNode } from 'react';
import { CharConfig, Equip, Slot, wornArt } from './charConfig';

// 캐릭터 그림 (2등신 동물). 머리에서 몸까지 선이 한 번에 이어지고, 귀·털도 그 선의 일부다
// 팔은 따로 그려서 팔만 휘두를 수 있다. 좌표는 200 x 240. 아이템(wear.svg)도 같은 좌표라 그대로 겹친다
// 손에 드는 것은 손 가운데가 (0,0): 왼손 (66,182), 오른손 (134,182)
const OUT = '#6e4034';   // 외곽선: 캐릭터와 아이템이 같은 색
const COLORS = {
  rabbit: { skin: '#fffcf5', accent: '#f6dc9c', cheek: '#f8c6d2' },
  sheep: { skin: '#fff8ea', accent: '#f8c9d6', cheek: '#f8c6d2' },
  bear: { skin: '#c9ddf5', accent: '#fff8ea', cheek: '#b4ccf0' },
  chick: { skin: '#fffcf5', accent: '#f6dc9c', cheek: '#f8c6d2' },
};
export type CharAnim = 'attack' | 'defend' | null;

// 머리 + 목 + 몸통을 한 선으로. 머리가 넓고 몸은 조금 좁다
const BODY = 'M56 132 C36 126 30 100 32 80 C34 46 60 34 100 34 C140 34 166 46 168 80 C170 100 164 126 144 132 C152 140 156 160 154 190 C153 212 140 218 100 218 C60 218 47 212 46 190 C44 160 48 140 56 132 Z';
// 팔: 어깨에서 내려와 안쪽으로 살짝 말린다 (굵은 선 두 겹으로 그린다)
const ARM_L = 'M52 152 C44 166 46 182 60 186 C68 188 72 182 68 178';
const ARM_R = 'M148 152 C156 166 154 182 140 186 C132 188 128 182 132 178';

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
    if (sp === 'rabbit') return <><rect x="52" y="2" width="36" height="76" rx="18" fill={c.skin} stroke={s} /><rect x="112" y="2" width="36" height="76" rx="18" fill={c.skin} stroke={s} /></>;
    if (sp === 'bear') return <><circle cx="52" cy="46" r="20" fill={c.skin} stroke={s} /><circle cx="148" cy="46" r="20" fill={c.skin} stroke={s} /></>;
    if (sp === 'sheep') return <>
      {[[42, 78, 22], [58, 50, 22], [84, 34, 24], [116, 34, 24], [142, 50, 22], [158, 78, 22]].map(([x, y, r]) => <circle key={x} cx={x} cy={y} r={r} fill={c.skin} stroke={s} />)}
    </>;
    return null;
  };

  const figure = (
    <>
      {sp === 'sheep' && <><ellipse cx="34" cy="106" rx="14" ry="22" fill={c.accent} /><ellipse cx="166" cy="106" rx="14" ry="22" fill={c.accent} /></>}
      {ears(true)}
      <path d={BODY} fill={c.skin} />
      {ears(false)}
      {/* 몸 무늬 */}
      {sp === 'rabbit' && <>
        <rect x="60" y="10" width="20" height="56" rx="10" fill={c.accent} stroke="none" /><rect x="120" y="10" width="20" height="56" rx="10" fill={c.accent} stroke="none" />
        <path d="M44 88 C50 50 150 50 156 88 C130 74 70 74 44 88 Z" fill={c.accent} stroke="none" />
        {!headOnly && <path d="M48 170 C70 160 130 160 152 170 L154 190 C153 212 140 218 100 218 C60 218 47 212 46 190 Z" fill={c.accent} stroke="none" />}
      </>}
      {sp === 'sheep' && <>
        <path d="M94 60 c-4 -9 9 -12 8 -3 c-1 7 -11 5 -8 -3" fill="none" strokeWidth="3.4" />
        {!headOnly && <path d="M110 180 C140 176 152 196 150 212 C130 218 108 214 106 196 Z" fill={c.accent} stroke="none" />}
      </>}
      {sp === 'bear' && !headOnly && <ellipse cx="100" cy="178" rx="30" ry="30" fill={c.accent} stroke="none" />}
      {sp === 'chick' && <>
        <path d="M100 36 V20" strokeWidth="4" />
        <ellipse cx="85" cy="16" rx="15" ry="8" transform="rotate(-32 85 16)" fill="#cfe3a1" /><ellipse cx="115" cy="16" rx="15" ry="8" transform="rotate(32 115 16)" fill="#cfe3a1" />
      </>}
      {/* 얼굴 */}
      <ellipse cx="62" cy="112" rx="13" ry="8" fill={c.cheek} stroke="none" /><ellipse cx="138" cy="112" rx="13" ry="8" fill={c.cheek} stroke="none" />
      <g className="animate-blink" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}><path d="M83 92 V104 M117 92 V104" strokeWidth="4.5" /></g>
      {sp === 'chick'
        ? <path d="M93 108 H107 L100 117 Z" fill="#f1c35f" strokeWidth="3.2" />
        : <path d="M95 114 H105" strokeWidth="4" />}
      {/* 전쟁모드 머리띠 (모자를 안 썼을 때만) */}
      {war && !equip?.head && <>
        <path d="M34 74 C66 60 134 60 166 74 L164 86 C134 72 66 72 36 86 Z" fill="#ff5d6c" />
        <path d="M164 78 L184 70 L180 84 Z M164 82 L182 94 L168 96 Z" fill="#ff5d6c" />
      </>}
    </>
  );

  return (
    <svg viewBox={viewBox ?? (headOnly ? '24 0 152 148' : '0 0 200 240')} className={`${className ?? ''} ${anim ? `anim-${anim}` : ''}`}
      aria-hidden="true" onAnimationEnd={onAnimationEnd}
      fill="none" stroke={OUT} strokeWidth="4.2" strokeLinejoin="round" strokeLinecap="round" overflow="visible">
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
          <path d={ARM_L} strokeWidth="17" /><path d={ARM_L} stroke={c.skin} strokeWidth="9.5" />
          <Worn equip={equip} slot="hands" at="translate(66 182)" />
          <Worn equip={equip} slot="leftHand" at="translate(66 182) rotate(10)" />
        </g>
        <g className="c-part c-rarm">
          <path d={ARM_R} strokeWidth="17" /><path d={ARM_R} stroke={c.skin} strokeWidth="9.5" />
          <Worn equip={equip} slot="hands" at="translate(134 182)" />
          <Worn equip={equip} slot="rightHand" at="translate(134 182) rotate(-15)" />
        </g>
      </>}
    </svg>
  );
}
