'use client';

import { useEffect, useState } from 'react';
import Sheet, { SheetHead } from '../ui/Sheet';
import CustomEditor from './CustomEditor';
import { CharConfig } from './charConfig';

// 캐릭터 꾸미기 창 (모두 무료). 열 때마다 지금 모습에서 시작하고, 저장해야 반영된다
export default function CustomSheet({ open, origin, cfg, war, onSave, onClose }: {
  open: boolean; origin?: HTMLElement | null; cfg: CharConfig; war: boolean;
  onSave: (cfg: CharConfig) => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState(cfg);
  useEffect(() => { if (open) setDraft(cfg); }, [open, cfg]);

  return (
    <Sheet open={open} origin={origin} onClose={onClose} labelledBy="customTitle">
      <SheetHead id="customTitle" title="캐릭터 꾸미기" onClose={onClose}>
        <span className="mr-auto rounded-[9px] bg-[#dbf4ee] px-[9px] py-[5px] text-[11px] font-extrabold text-[#1ea88b] war:bg-[rgba(30,168,139,.18)] war:text-[#5fd3b5]">모두 무료</span>
      </SheetHead>
      {open && <CustomEditor draft={draft} onChange={setDraft} war={war} />}
      <footer className="flex gap-2 border-t border-(--chip-bg) px-4 pt-3 pb-4">
        <button onClick={onClose} className="h-[46px] flex-1 rounded-[14px] bg-(--chip-bg) text-[15px] font-extrabold text-(--ink) transition-transform active:scale-97">취소</button>
        <button onClick={() => onSave(draft)} className="h-[46px] flex-1 rounded-[14px] bg-(--primary) text-[15px] font-extrabold text-white shadow-[0_6px_14px_rgba(124,108,246,.3)] transition-transform active:scale-97">저장</button>
      </footer>
    </Sheet>
  );
}
