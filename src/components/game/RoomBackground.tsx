// 방 배경: 벽·바닥·창문·액자·스탠드·화분·러그. 전쟁모드면 밤 + 깃발
export default function RoomBackground({ war = false }: { war?: boolean }) {
  const wood = war ? '#4a3d63' : '#fff', metal = war ? '#5b4d73' : '#c9a27a';
  const deco = 'absolute z-1 drop-shadow-[0_4px_6px_rgba(60,35,20,.12)]';
  return (
    <>
      <div className="room-wall absolute inset-x-0 top-0 bottom-[38%]" />
      <div className="room-floor absolute inset-x-0 top-[62%] bottom-0">
        <div className="absolute inset-x-0 -top-3 h-3 bg-(--base)" />
        <div className="absolute inset-x-0 top-0 h-12 bg-linear-to-b from-black/10 to-transparent" />
      </div>

      {/* 창문 */}
      <svg className={`${deco} top-[15%] left-[57%] w-[132px] -translate-x-1/2`} viewBox="0 0 160 140" aria-hidden="true">
        <defs><linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={war ? '#1c2152' : '#bfe4ff'} /><stop offset="1" stopColor={war ? '#3d2c6b' : '#eef8ff'} />
        </linearGradient></defs>
        <rect x="20" y="12" width="120" height="104" rx="12" fill={wood} />
        <rect x="28" y="20" width="104" height="88" rx="7" fill="url(#gSky)" />
        {war
          ? <g><path d="M104 34a12 12 0 1 0 11 18 10 10 0 1 1-11-18z" fill="#ffe7a8" /><circle cx="48" cy="40" r="1.6" fill="#fff" /><circle cx="64" cy="58" r="1.2" fill="#fff" /><circle cx="90" cy="84" r="1.4" fill="#fff" /><circle cx="118" cy="92" r="1.1" fill="#fff" /></g>
          : <g><circle cx="106" cy="44" r="10" fill="#ffdc7a" /><path d="M42 84a9 9 0 0 1 16-6 8 8 0 0 1 14 4 6.5 6.5 0 0 1-2 12.8H46a7.5 7.5 0 0 1-4-10.8z" fill="#fff" /></g>}
        <rect x="78" y="20" width="4" height="88" fill={wood} /><rect x="28" y="62" width="104" height="4" fill={wood} />
        <rect x="12" y="114" width="136" height="10" rx="5" fill={wood} />
        <rect x="4" y="4" width="152" height="6" rx="3" fill={metal} />
        <path d="M6 8h30c-4 28-8 48-12 68 6 16 8 30 6 46H6z" fill={war ? '#7d2436' : '#ffb3c7'} />
        <path d="M154 8h-30c4 28 8 48 12 68-6 16-8 30-6 46h24z" fill={war ? '#7d2436' : '#ffb3c7'} />
      </svg>

      {/* 액자 (전쟁모드: 깃발) */}
      <svg className={`${deco} top-[34%] left-[9%] w-[66px]`} viewBox="0 0 80 80" aria-hidden="true">
        {war
          ? <g><rect x="10" y="2" width="60" height="6" rx="3" fill="#caa56a" /><path d="M16 6h48v64L40 58 16 70z" fill="#b8324a" /><path d="M31 24l18 18M49 24L31 42" stroke="#ffd98a" strokeWidth="3.2" strokeLinecap="round" /></g>
          : <g><rect x="6" y="8" width="68" height="54" rx="6" fill={wood} /><rect x="12" y="14" width="56" height="42" rx="3" fill="#cfe9ff" /><path d="M12 56l16-18 11 11 9-9 20 16z" fill="#8fd19e" /><circle cx="56" cy="25" r="5" fill="#ffd66e" /></g>}
      </svg>

      {/* 스탠드 */}
      <svg className={`${deco} bottom-[33%] left-[4%] w-[46px]`} viewBox="0 0 60 160" aria-hidden="true">
        <ellipse cx="30" cy="154" rx="18" ry="4" fill="#000" opacity=".12" />
        <rect x="28" y="46" width="4" height="104" rx="2" fill={metal} />
        <ellipse cx="30" cy="150" rx="14" ry="4.5" fill={metal} />
        <path d="M10 50h40L41 12H19z" fill={war ? '#ff9f6b' : '#fff4dc'} />
      </svg>

      {/* 화분 */}
      <svg className={`${deco} right-[5%] bottom-[32%] w-[60px]`} viewBox="0 0 70 110" aria-hidden="true">
        <ellipse cx="35" cy="106" rx="20" ry="4" fill="#000" opacity=".12" />
        <path d="M35 64C20 56 10 40 14 24c12 6 20 20 21 40zM35 64c14-8 24-24 20-40-12 6-19 20-20 40zM35 62c-4-16 0-34 8-46 6 14 2 32-8 46z" fill={war ? '#44604d' : '#7cc58b'} />
        <path d="M18 66h34l-5 38H23z" fill={war ? '#57466e' : '#f3a07a'} />
        <rect x="15" y="60" width="40" height="9" rx="4" fill={war ? '#57466e' : '#f3a07a'} />
      </svg>

      {/* 러그 */}
      <svg className="absolute bottom-[calc(29%-26px)] left-1/2 z-1 w-[250px] -translate-x-1/2" viewBox="0 0 260 70" aria-hidden="true">
        <ellipse cx="130" cy="35" rx="128" ry="33" fill="var(--rug-1)" />
        <ellipse cx="130" cy="35" rx="108" ry="24" fill="none" stroke="var(--rug-2)" strokeWidth="3" strokeDasharray="1 8" strokeLinecap="round" />
      </svg>
    </>
  );
}
