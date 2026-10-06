import Icon from '../ui/Icon';
import { Spinner } from '../auth/GateScreens';

const BOX = 'rounded-[14px] bg-(--chip-bg) px-3.5 py-3 text-[12px] font-bold text-(--ink-2)';

// 친구 목록을 읽는 중
export function FriendsLoading() {
  return (
    <p role="status" className={`${BOX} flex items-center gap-2`}><Spinner />친구를 불러오는 중…</p>
  );
}

// 읽지 못했을 때: "친구 없음"으로 보이지 않게 따로 알리고 다시 읽게 한다
export function FriendsLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className={BOX}>
      <p className="text-[#d03a40] war:text-[#ff8791]">{message}</p>
      <button type="button" onClick={onRetry}
        className="mt-2 h-8 rounded-[10px] bg-(--card) px-3 text-xs font-extrabold text-(--ink) shadow-[0_2px_6px_rgba(0,0,0,.08)]">
        다시 불러오기
      </button>
    </div>
  );
}

// 친구가 한 명도 없을 때
export function FriendsEmpty({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-(--card) px-4 py-7 text-center shadow-[0_2px_8px_rgba(60,40,80,.07)]">
      <span className="grid size-12 place-items-center rounded-2xl bg-(--chip-bg) text-(--primary)"><Icon name="i-heart" className="size-6" /></span>
      <p className="text-sm font-extrabold text-balance">아직 친구가 없어요. 친구 코드를 나눠 보세요</p>
      <button type="button" onClick={onAdd}
        className="mt-1 flex h-9 items-center gap-1 rounded-xl bg-(--primary) px-4 text-xs font-extrabold text-white shadow-[0_6px_14px_rgba(124,108,246,.3)] war:shadow-none">
        <Icon name="i-plus" className="size-3.5" />친구 추가하기
      </button>
    </div>
  );
}
