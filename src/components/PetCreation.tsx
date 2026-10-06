'use client';

import { FormEvent, useState } from 'react';
import { Pet } from '@/types/pet';
import CustomEditor from './character/CustomEditor';
import { CharConfig, DEFAULT_CFG, saveCfg } from './character/charConfig';
import RoomBackground from './game/RoomBackground';

interface PetCreationProps {
  onPetCreated: (pet: Pet) => void;
}

// TODO: src/lib/pet.ts 가 main 에 들어오면 createPet(name, userId) 로 바꾼다 (기본값은 그 함수와 같게 맞춰 둠)
function makePet(name: string, userId: string): Pet {
  const now = Math.floor(Date.now() / 1000);
  return {
    petId: `pet_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`, name, userId,
    level: 1, exp: 0,
    hunger: 50, tiredness: 30, cleanliness: 70, happiness: 60, isAwake: true,
    outfit: 'basic', backgroundColor: 'white', furniture: [],
    cash: 100,
    createdAt: now, lastFeedTime: now, lastPlayTime: now, lastCashRecoveryTime: now, sleepStartTime: null, updatedAt: now,
    friends: [], friendshipScores: {}, lastVisitTime: {},
  };
}

// 첫 화면: 캐릭터 모습을 고르고 이름을 지으면 내 집으로
export default function PetCreation({ onPetCreated }: PetCreationProps) {
  const [cfg, setCfg] = useState<CharConfig>(DEFAULT_CFG);
  const [name, setName] = useState('');
  const trimmed = name.trim();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!trimmed) return;
    saveCfg(cfg);
    onPetCreated(makePet(trimmed, `user_${Date.now()}`));
  };

  return (
    <main className="room relative isolate h-dvh w-full max-w-[430px] overflow-hidden text-(--ink)">
      <RoomBackground />
      <form onSubmit={submit} aria-labelledby="createTitle"
        className="absolute top-[5%] left-[5%] z-31 flex h-[90%] w-[90%] animate-pop flex-col overflow-hidden rounded-[26px] bg-(--sheet) shadow-[0_24px_60px_rgba(0,0,0,.35)]">
        <header className="pt-[18px] pr-4 pb-3.5 pl-5">
          <h1 id="createTitle" className="text-xl font-extrabold tracking-[-.02em]">내 캐릭터 만들기</h1>
          <p className="mt-0.5 text-xs font-semibold text-(--ink-2)">모습은 나중에 캐릭터를 눌러 언제든 바꿀 수 있어요</p>
        </header>
        <CustomEditor draft={cfg} onChange={setCfg} />
        <footer className="flex flex-col gap-2 border-t border-(--chip-bg) px-4 pt-3 pb-4">
          <label className="flex items-center gap-2">
            <span className="sr-only">이름</span>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={12} placeholder="이름을 지어 주세요" autoComplete="off"
              className="h-[46px] min-w-0 flex-1 rounded-[14px] bg-(--chip-bg) px-4 text-[15px] font-bold outline-none placeholder:font-semibold placeholder:text-(--ink-2) focus:ring-2 focus:ring-(--primary)" />
            <span className="w-9 text-right text-[11px] font-bold text-(--ink-2) tabular-nums">{name.length}/12</span>
          </label>
          <button disabled={!trimmed}
            className="h-[46px] rounded-[14px] bg-(--primary) text-[15px] font-extrabold text-white shadow-[0_6px_14px_rgba(124,108,246,.3)] transition-transform active:scale-97 disabled:bg-(--chip-bg) disabled:text-(--ink-2) disabled:shadow-none">
            시작하기
          </button>
        </footer>
      </form>
    </main>
  );
}
