'use client';

import { useState, useEffect } from 'react';
import { Pet } from '@/types/pet';
import { addCareLog, addCashLog } from '@/lib/pet';
import Shop from './Shop';
import Friends from './Friends';

interface GameScreenProps {
  pet: Pet;
}

const STAT_COLORS: Record<string, string> = {
  hunger: '#ff6b6b',
  tiredness: '#4ecdc4',
  cleanliness: '#45b7d1',
  happiness: '#f9ca24',
};

const STAT_LABELS: Record<string, string> = {
  hunger: '배고픔',
  tiredness: '피로도',
  cleanliness: '청결도',
  happiness: '행복도',
};

const ACTION_EMOJIS: Record<string, string> = {
  feed: '🍖',
  clean: '🛁',
  sleep: '😴',
  play: '🎮',
};

export default function GameScreen({ pet: initialPet }: GameScreenProps) {
  const [pet, setPet] = useState(initialPet);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [showShop, setShowShop] = useState(false);
  const [showFriends, setShowFriends] = useState(false);

  // Simulate cooldown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCooldowns((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          next[key] = Math.max(0, next[key] - 1);
        });
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getPetState = () => {
    const hunger = pet.hunger;
    if (hunger < 30) return { emoji: '😊', text: '배불러!' };
    if (hunger < 60) return { emoji: '😐', text: '보통' };
    if (hunger < 80) return { emoji: '😕', text: '배고파!' };
    return { emoji: '😢', text: '우아악!' };
  };

  const formatTime = (seconds: number): string => {
    if (seconds === 0) return '가능!';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const performAction = async (action: string, costCash: number = 0) => {
    if (cooldowns[action] && cooldowns[action] > 0) return;

    if (pet.cash < costCash) {
      alert('캐시가 부족합니다!');
      return;
    }

    // Get playerId from localStorage
    const playerId = typeof window !== 'undefined' ? localStorage.getItem('currentUserId') : null;
    if (!playerId) {
      alert('사용자 정보를 찾을 수 없습니다.');
      return;
    }

    // Record action to Supabase
    try {
      // 1. Record care log
      const actionTypeMap: Record<string, 'feed' | 'clean' | 'shower' | 'sleep' | 'play'> = {
        feed: 'feed',
        clean: 'clean',
        sleep: 'sleep',
        play: 'play',
      };
      await addCareLog(playerId, actionTypeMap[action]);

      // 2. Record cash log if cost exists
      if (costCash > 0) {
        await addCashLog(playerId, -costCash, action as any);
      }
    } catch (error) {
      console.error('Failed to record action:', error);
    }

    // Update pet state based on action
    const newPet = { ...pet };

    switch (action) {
      case 'feed':
        newPet.hunger = Math.max(0, newPet.hunger - 30);
        newPet.exp += 3;
        newPet.cash -= 10;
        setCooldowns((prev) => ({ ...prev, feed: 90 }));
        break;
      case 'clean':
        newPet.cleanliness = Math.min(100, newPet.cleanliness + 40);
        newPet.exp += 2;
        newPet.cash -= 15;
        setCooldowns((prev) => ({ ...prev, clean: 120 }));
        break;
      case 'sleep':
        newPet.tiredness = Math.max(0, newPet.tiredness - 50);
        newPet.isAwake = false;
        newPet.exp += 1;
        setCooldowns((prev) => ({ ...prev, sleep: 0 }));
        break;
      case 'play':
        if (newPet.tiredness >= 80) {
          alert('펫이 너무 피곤합니다. 먼저 재워주세요!');
          return;
        }
        newPet.happiness = Math.min(100, newPet.happiness + 30);
        newPet.exp += 5;
        newPet.cash -= 5;
        setCooldowns((prev) => ({ ...prev, play: 45 }));
        break;
    }

    // Level up if exp >= 100
    if (newPet.exp >= 100) {
      newPet.level += 1;
      newPet.exp = 0;
    }

    setPet(newPet);
  };

  const { emoji, text } = getPetState();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-blue-300 pb-[100px]">
      {/* Header */}
      <div className="flex justify-between items-center p-5 bg-white border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0">{pet.name}</h1>
          <p className="text-sm text-gray-600 m-1">Lv.{pet.level}</p>
        </div>
        <div className="flex items-center gap-2 text-lg font-bold">
          <span className="text-2xl">💰</span>
          <span className="text-primary">{pet.cash}</span>
        </div>
      </div>

      {/* Pet Display */}
      <div className="text-center py-10">
        <div className="relative mb-3">
          <div
            className="text-9xl animate-bounce transition-opacity"
            style={{ opacity: pet.isAwake ? 1 : 0.6 }}
          >
            {emoji}
          </div>
          {!pet.isAwake && (
            <div className="absolute top-0 -right-5 text-2xl animate-float">
              zzz...
            </div>
          )}
        </div>
        <p className="text-base font-bold text-primary m-0">{text}</p>
      </div>

      {/* Experience Bar */}
      <div className="p-5 bg-white mx-5 rounded-lg mb-5">
        <div className="flex justify-between text-xs text-gray-600 mb-2 font-bold">
          <span>경험치</span>
          <span>
            {pet.exp}/100
          </span>
        </div>
        <div className="w-full h-2 bg-gray-300 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-secondary transition-all"
            style={{ width: `${pet.exp}%` }}
          ></div>
        </div>
      </div>

      {/* Stats Bars */}
      <div className="px-5 flex flex-col gap-3 mb-5">
        {(['hunger', 'tiredness', 'cleanliness', 'happiness'] as const).map(
          (stat) => (
            <div
              key={stat}
              className="bg-white p-3 rounded-lg flex items-center gap-3"
            >
              <div className="text-xs font-bold text-gray-600 min-w-12">
                {STAT_LABELS[stat]}
              </div>
              <div className="flex-1 h-2 bg-gray-300 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${pet[stat]}%`,
                    backgroundColor: STAT_COLORS[stat],
                  }}
                ></div>
              </div>
              <div className="text-xs font-bold text-gray-900 min-w-7 text-right">
                {pet[stat]}
              </div>
            </div>
          )
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-5 grid grid-cols-2 gap-3 mb-5">
        <button
          onClick={() => performAction('feed')}
          disabled={!!(cooldowns.feed && cooldowns.feed > 0)}
          className={`bg-white border-2 border-gray-200 rounded-xl p-4 cursor-pointer transition-all hover:enabled:-translate-y-0.5 hover:enabled:shadow-card active:enabled:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 font-sans ${
            pet.hunger > 80 ? 'border-danger bg-red-50' : ''
          }`}
        >
          <span className="text-2xl">🍖</span>
          <div>
            <div className="text-sm font-bold text-gray-900">밥주기</div>
            <div className="text-xs text-gray-600">10캐시</div>
            {cooldowns.feed && cooldowns.feed > 0 && (
              <div className="text-xs text-primary font-bold">
                {formatTime(cooldowns.feed)}
              </div>
            )}
          </div>
        </button>

        <button
          onClick={() => performAction('clean')}
          disabled={!!(cooldowns.clean && cooldowns.clean > 0)}
          className="bg-white border-2 border-gray-200 rounded-xl p-4 cursor-pointer transition-all hover:enabled:-translate-y-0.5 hover:enabled:shadow-card active:enabled:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 font-sans"
        >
          <span className="text-2xl">🛁</span>
          <div>
            <div className="text-sm font-bold text-gray-900">청소하기</div>
            <div className="text-xs text-gray-600">15캐시</div>
            {cooldowns.clean && cooldowns.clean > 0 && (
              <div className="text-xs text-primary font-bold">
                {formatTime(cooldowns.clean)}
              </div>
            )}
          </div>
        </button>

        <button
          onClick={() => performAction('sleep')}
          disabled={pet.isAwake === false}
          className={`bg-white border-2 border-gray-200 rounded-xl p-4 cursor-pointer transition-all hover:enabled:-translate-y-0.5 hover:enabled:shadow-card active:enabled:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 font-sans ${
            pet.tiredness > 80 ? 'border-info bg-blue-50' : ''
          }`}
        >
          <span className="text-2xl">😴</span>
          <div>
            <div className="text-sm font-bold text-gray-900">
              {pet.isAwake ? '재우기' : '깨우기'}
            </div>
            <div className="text-xs text-gray-600">무료</div>
          </div>
        </button>

        <button
          onClick={() => performAction('play')}
          disabled={!!(
            (cooldowns.play && cooldowns.play > 0) ||
            pet.tiredness >= 80 ||
            !pet.isAwake
          )}
          className="bg-white border-2 border-gray-200 rounded-xl p-4 cursor-pointer transition-all hover:enabled:-translate-y-0.5 hover:enabled:shadow-card active:enabled:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 font-sans"
        >
          <span className="text-2xl">🎮</span>
          <div>
            <div className="text-sm font-bold text-gray-900">놀아주기</div>
            <div className="text-xs text-gray-600">5캐시</div>
            {cooldowns.play && cooldowns.play > 0 && (
              <div className="text-xs text-primary font-bold">
                {formatTime(cooldowns.play)}
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-around bg-white border-t border-gray-200 p-2 shadow-lg">
        <button className="flex-1 border-none bg-none p-3 cursor-pointer text-gray-900 font-bold text-base transition-colors hover:text-primary">
          🏠 집
        </button>
        <button
          className="flex-1 border-none bg-none p-3 cursor-pointer text-gray-600 font-normal text-base transition-colors hover:text-primary"
          onClick={() => setShowFriends(true)}
        >
          👥 친구
        </button>
        <button
          className="flex-1 border-none bg-none p-3 cursor-pointer text-gray-600 font-normal text-base transition-colors hover:text-primary"
          onClick={() => setShowShop(true)}
        >
          🛍️ 상점
        </button>
        <button className="flex-1 border-none bg-none p-3 cursor-pointer text-gray-600 font-normal text-base transition-colors hover:text-primary">
          ⚙️ 설정
        </button>
      </div>

      {/* Shop Modal */}
      {showShop && (
        <Shop
          pet={pet}
          onPetUpdate={setPet}
          onClose={() => setShowShop(false)}
        />
      )}

      {/* Friends Modal */}
      {showFriends && (
        <Friends
          pet={pet}
          onPetUpdate={setPet}
          onClose={() => setShowFriends(false)}
        />
      )}
    </div>
  );
}
