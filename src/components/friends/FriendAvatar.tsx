import Character from '../character/Character';
import { SPECIES_LIST, Species } from '../character/charConfig';

// 친구의 캐릭터 모습은 아직 DB 에 없다(내 모습은 이 브라우저에만 저장). 그래서 번호로 정한 임시 모습을 보여 준다
export function speciesForPlayer(id: number): Species {
  return SPECIES_LIST[Math.abs(id) % SPECIES_LIST.length];
}

// 동그란 얼굴 사진 (친구 카드·요청 목록 공통)
export default function FriendAvatar({ id, className = 'size-11' }: { id: number; className?: string }) {
  return (
    <span className={`${className} flex-none overflow-hidden rounded-full bg-linear-135 from-[#ffe1ec] to-[#e4dcff]`}>
      <Character cfg={{ species: speciesForPlayer(id) }} headOnly className="size-full" />
    </span>
  );
}
