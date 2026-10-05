'use client';

import { useState } from 'react';
import { Pet } from '@/types/pet';
import PetCreation from '@/components/PetCreation';
import GameScreen from '@/components/GameScreen';

export default function Home() {
  const [pet, setPet] = useState<Pet | null>(null);

  return (
    <>
      {!pet ? (
        <PetCreation onPetCreated={setPet} />
      ) : (
        <GameScreen pet={pet} />
      )}
    </>
  );
}
