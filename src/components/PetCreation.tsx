'use client';

import { useState } from 'react';
import { createPet } from '@/lib/pet';
import { Pet } from '@/types/pet';

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

    setTimeout(() => {
      const userId = `user_${Date.now()}`;
      const newPet = createPet(petName, userId);

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-secondary p-5">
      <div className="bg-white rounded-2xl p-10 max-w-sm w-full shadow-modal">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">🐾 펫 친구 만들기</h1>
          <p className="text-sm text-gray-600 mt-2">당신의 펫에게 이름을 지어주세요!</p>
        </div>

        {/* Pet Preview */}
        <div className="text-center mb-10">
          <div className="bg-gradient-to-br from-blue-100 to-blue-300 rounded-xl p-8 min-h-32 flex flex-col items-center justify-center">
            <span className="text-8xl animate-bounce">🐰</span>
            {petName && (
              <p className="text-xl font-bold text-gray-900 mt-3 animate-fadeIn">
                {petName}
              </p>
            )}
          </div>
        </div>

        {/* Input Group */}
        <div className="mb-5">
          <input
            type="text"
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="펫의 이름을 입력하세요"
            maxLength={20}
            disabled={isCreating}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base transition-all focus:outline-none focus:border-primary focus:ring-4 focus:ring-blue-100 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-gray-600 text-right mt-1">
            {petName.length}/20
          </p>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleCreatePet}
          disabled={isCreating || !petName.trim()}
          className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-lg transition-all hover:enabled:-translate-y-0.5 hover:enabled:shadow-lg active:enabled:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed mb-5"
        >
          {isCreating ? '생성 중...' : '게임 시작 🚀'}
        </button>

        {/* Info Box */}
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-primary m-0">
            💡 팁: 언제든지 펫의 이름으로 부를 수 있어요!
          </p>
        </div>
      </div>
    </div>
  );
}
