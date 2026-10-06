import { Pet } from '@/types/pet';

// 브라우저에 내 펫을 저장 (plan.md: 로그인 없이 브라우저에 저장한 player id 로 나를 구분)
// TODO: src/lib/pet.ts 가 main 에 들어오면 레벨·캐시는 getMyLevel / getCashBalance 로 DB 에서 읽는다
const PET_KEY = 'atlas.pet';

export function loadPet(): Pet | null {
  try {
    const p = JSON.parse(localStorage.getItem(PET_KEY) || 'null');
    return p && typeof p.name === 'string' && typeof p.userId === 'string' ? p : null;
  } catch { return null; }
}

export function savePet(pet: Pet) {
  try { localStorage.setItem(PET_KEY, JSON.stringify(pet)); } catch { /* 저장 안 돼도 화면은 그대로 */ }
}
