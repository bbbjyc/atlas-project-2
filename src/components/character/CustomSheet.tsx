'use client';

import { useState } from 'react';
import Sheet, { SheetHead, useSheetClose } from '../ui/Sheet';
import CustomEditor from './CustomEditor';
import { CharConfig, Equip } from './charConfig';

// 캐릭터 꾸미기 창 (모두 무료). 열 때마다 지금 모습에서 시작하고, 저장해야 반영된다
export default function CustomSheet({ cfg, equip, owned, war, onSave, onClose }: {
  cfg: CharConfig; equip: Equip; owned: string[]; war: boolean;
  onSave: (cfg: CharConfig, equip: Equip) => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState(cfg);
  const [draftEquip, setDraftEquip] = useState(equip);
  return (
    <Sheet onClose={onClose} labelledBy="customTitle">
      <SheetHead id="customTitle" title="캐릭터 꾸미기">
        <span className="mr-auto rounded-[9px] bg-[#dbf4ee] px-[9px] py-[5px] text-[11px] font-extrabold text-[#1ea88b] war:bg-[rgba(30,168,139,.18)] war:text-[#5fd3b5]">바꾸기 무료</span>
      </SheetHead>
      <CustomEditor draft={draft} onChange={setDraft} war={war} wardrobe={{ owned, equip: draftEquip, onEquip: setDraftEquip }} />
      <Footer onSave={() => onSave(draft, draftEquip)} />
    </Sheet>
  );
}

function Footer({ onSave }: { onSave: () => void }) {
  const close = useSheetClose();
  return (
    <footer className="flex gap-2 border-t border-(--chip-bg) px-4 pt-3 pb-4">
      <button onClick={close} className="h-[46px] flex-1 rounded-[14px] bg-(--chip-bg) text-[15px] font-extrabold text-(--ink) transition-transform active:scale-97">취소</button>
      <button onClick={() => { onSave(); close(); }} className="h-[46px] flex-1 rounded-[14px] bg-(--primary) text-[15px] font-extrabold text-white shadow-[0_6px_14px_rgba(124,108,246,.3)] transition-transform active:scale-97">저장</button>
    </footer>
  );
}
