'use client';

import { useEffect, useState } from 'react';
import { Pet } from '@/types/pet';
import PetCreation from '@/components/PetCreation';
import GameScreen from '@/components/GameScreen';
import { loadPet } from '@/components/game/storage';

export default function Home() {
  const [pet, setPet] = useState<Pet | null>(null);
  const [ready, setReady] = useState(false);   // 브라우저에 저장된 펫을 읽기 전에는 아무것도 그리지 않는다

  useEffect(() => { setPet(loadPet()); setReady(true); }, []);

  if (!ready) return null;
  return !pet ? <PetCreation onPetCreated={setPet} /> : <GameScreen pet={pet} />;
}
