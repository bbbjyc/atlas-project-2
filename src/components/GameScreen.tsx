'use client';

import { useState, useEffect } from 'react';
import { Pet } from '@/types/pet';
import Shop from './Shop';
import styles from './GameScreen.module.css';

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

  const performAction = (action: string, costCash: number = 0) => {
    if (cooldowns[action] && cooldowns[action] > 0) return;

    if (pet.cash < costCash) {
      alert('캐시가 부족합니다!');
      return;
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
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.petInfo}>
          <h1>{pet.name}</h1>
          <p className={styles.level}>Lv.{pet.level}</p>
        </div>
        <div className={styles.cash}>
          <span className={styles.cashIcon}>💰</span>
          <span className={styles.cashAmount}>{pet.cash}</span>
        </div>
      </div>

      {/* Pet Display */}
      <div className={styles.petDisplay}>
        <div className={styles.petContainer}>
          <div className={styles.petEmoji} style={{ opacity: pet.isAwake ? 1 : 0.6 }}>
            {emoji}
          </div>
          {!pet.isAwake && <div className={styles.sleepZs}>zzz...</div>}
        </div>
        <p className={styles.petStatus}>{text}</p>
      </div>

      {/* Experience Bar */}
      <div className={styles.expSection}>
        <div className={styles.expLabel}>
          <span>경험치</span>
          <span>{pet.exp}/100</span>
        </div>
        <div className={styles.expBar}>
          <div
            className={styles.expFill}
            style={{ width: `${pet.exp}%` }}
          ></div>
        </div>
      </div>

      {/* Stats Bars */}
      <div className={styles.stats}>
        {(['hunger', 'tiredness', 'cleanliness', 'happiness'] as const).map((stat) => (
          <div key={stat} className={styles.statRow}>
            <div className={styles.statLabel}>{STAT_LABELS[stat]}</div>
            <div className={styles.statBar}>
              <div
                className={styles.statFill}
                style={{
                  width: `${pet[stat]}%`,
                  backgroundColor: STAT_COLORS[stat],
                }}
              ></div>
            </div>
            <div className={styles.statValue}>{pet[stat]}</div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className={styles.actions}>
        <button
          onClick={() => performAction('feed')}
          disabled={cooldowns.feed && cooldowns.feed > 0}
          className={`${styles.button} ${pet.hunger > 80 ? styles.urgent : ''}`}
        >
          <span className={styles.emoji}>{ACTION_EMOJIS.feed}</span>
          <div>
            <div className={styles.actionName}>밥주기</div>
            <div className={styles.actionCost}>10캐시</div>
            {cooldowns.feed && cooldowns.feed > 0 && (
              <div className={styles.cooldown}>{formatTime(cooldowns.feed)}</div>
            )}
          </div>
        </button>

        <button
          onClick={() => performAction('clean')}
          disabled={cooldowns.clean && cooldowns.clean > 0}
          className={styles.button}
        >
          <span className={styles.emoji}>{ACTION_EMOJIS.clean}</span>
          <div>
            <div className={styles.actionName}>청소하기</div>
            <div className={styles.actionCost}>15캐시</div>
            {cooldowns.clean && cooldowns.clean > 0 && (
              <div className={styles.cooldown}>{formatTime(cooldowns.clean)}</div>
            )}
          </div>
        </button>

        <button
          onClick={() => performAction('sleep')}
          disabled={pet.isAwake === false}
          className={`${styles.button} ${pet.tiredness > 80 ? styles.urgent : ''}`}
        >
          <span className={styles.emoji}>{ACTION_EMOJIS.sleep}</span>
          <div>
            <div className={styles.actionName}>{pet.isAwake ? '재우기' : '깨우기'}</div>
            <div className={styles.actionCost}>무료</div>
          </div>
        </button>

        <button
          onClick={() => performAction('play')}
          disabled={
            (cooldowns.play && cooldowns.play > 0) ||
            pet.tiredness >= 80 ||
            !pet.isAwake
          }
          className={styles.button}
        >
          <span className={styles.emoji}>{ACTION_EMOJIS.play}</span>
          <div>
            <div className={styles.actionName}>놀아주기</div>
            <div className={styles.actionCost}>5캐시</div>
            {cooldowns.play && cooldowns.play > 0 && (
              <div className={styles.cooldown}>{formatTime(cooldowns.play)}</div>
            )}
          </div>
        </button>
      </div>

      {/* Bottom Navigation */}
      <div className={styles.navbar}>
        <button className={`${styles.navButton} ${styles.active}`}>🏠 집</button>
        <button className={styles.navButton}>👥 친구</button>
        <button className={styles.navButton} onClick={() => setShowShop(true)}>
          🛍️ 상점
        </button>
        <button className={styles.navButton}>⚙️ 설정</button>
      </div>

      {/* Shop Modal */}
      {showShop && (
        <Shop
          pet={pet}
          onPetUpdate={setPet}
          onClose={() => setShowShop(false)}
        />
      )}
    </div>
  );
}
