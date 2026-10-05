'use client';

import { useState } from 'react';
import { createPet } from '@/lib/pet';
import { Pet } from '@/types/pet';
import styles from './PetCreation.module.css';

interface PetCreationProps {
  onPetCreated: (pet: Pet) => void;
}

export default function PetCreation({ onPetCreated }: PetCreationProps) {
  const [petName, setPetName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreatePet = () => {
    if (!petName.trim()) {
      alert('펫의 이름을 입력해주세요!');
      return;
    }

    setIsCreating(true);

    // Simulate creation delay
    setTimeout(() => {
      const userId = `user_${Date.now()}`;
      const newPet = createPet(petName, userId);

      // Store petId and userId in localStorage
      localStorage.setItem('currentPetId', newPet.petId);
      localStorage.setItem('currentUserId', userId);

      onPetCreated(newPet);
      setIsCreating(false);
    }, 500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreatePet();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>🐾 펫 친구 만들기</h1>
          <p>당신의 펫에게 이름을 지어주세요!</p>
        </div>

        <div className={styles.illustration}>
          <div className={styles.petPreview}>
            <span className={styles.petEmoji}>🐰</span>
            {petName && <p className={styles.petName}>{petName}</p>}
          </div>
        </div>

        <div className={styles.inputGroup}>
          <input
            type="text"
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="펫의 이름을 입력하세요"
            maxLength={20}
            className={styles.input}
            disabled={isCreating}
          />
          <p className={styles.charCount}>{petName.length}/20</p>
        </div>

        <button
          onClick={handleCreatePet}
          disabled={isCreating || !petName.trim()}
          className={styles.button}
        >
          {isCreating ? '생성 중...' : '게임 시작 🚀'}
        </button>

        <div className={styles.info}>
          <p>💡 팁: 언제든지 펫의 이름으로 부를 수 있어요!</p>
        </div>
      </div>
    </div>
  );
}
