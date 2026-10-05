'use client';

import { useState, useEffect } from 'react';
import { Pet } from '@/types/pet';
import styles from './Friends.module.css';

interface FriendsProps {
  pet: Pet;
  onPetUpdate: (pet: Pet) => void;
  onClose: () => void;
}

interface FriendData {
  id: string;
  name: string;
  petName: string;
  petState: {
    level: number;
    hunger: number;
    tiredness: number;
    cleanliness: number;
    happiness: number;
  };
  friendshipScore: number;
  lastVisitTime: number | null;
  nextVisitTime: number;
}

export default function Friends({ pet, onPetUpdate, onClose }: FriendsProps) {
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [inviteCode, setInviteCode] = useState<string>('');
  const [showInvite, setShowInvite] = useState(false);

  // Initialize with mock friends (in real app, load from Supabase)
  useEffect(() => {
    // Generate mock invite code
    const code = `invite_${pet.petId.slice(0, 8)}`;
    setInviteCode(code);

    // Create mock friends for demo
    const mockFriends: FriendData[] = [
      {
        id: 'friend_1',
        name: '원영',
        petName: '뽀삐',
        petState: {
          level: 3,
          hunger: 45,
          tiredness: 20,
          cleanliness: 80,
          happiness: 75,
        },
        friendshipScore: 45,
        lastVisitTime: Date.now() - 2 * 3600 * 1000, // 2 hours ago
        nextVisitTime: Date.now() + (5 * 3600 * 1000 - 2 * 3600 * 1000), // 3 hours later
      },
      {
        id: 'friend_2',
        name: '연준',
        petName: '나비',
        petState: {
          level: 5,
          hunger: 30,
          tiredness: 35,
          cleanliness: 60,
          happiness: 85,
        },
        friendshipScore: 78,
        lastVisitTime: Date.now() - 5 * 3600 * 1000,
        nextVisitTime: 0, // Can visit now
      },
    ];

    setFriends(mockFriends);
  }, [pet.petId]);

  const formatTime = (timestamp: number): string => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return `${Math.floor(diff / 86400)}일 전`;
  };

  const formatCountdown = (timestamp: number): string => {
    const diff = Math.floor((timestamp - Date.now()) / 1000);
    if (diff <= 0) return '지금 방문 가능!';
    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    if (hours > 0) return `${hours}시간 ${mins}분 후`;
    return `${mins}분 후`;
  };

  const handleVisit = (friendId: string) => {
    alert(`${friendId}의 펫을 방문했습니다! 🏠`);
  };

  const handleGift = (friendId: string) => {
    if (pet.cash < 10) {
      alert('캐시가 부족합니다!');
      return;
    }

    const updatedPet = { ...pet, cash: pet.cash - 10 };
    const updatedFriends = friends.map((friend) => {
      if (friend.id === friendId) {
        return {
          ...friend,
          friendshipScore: Math.min(100, friend.friendshipScore + 5),
        };
      }
      return friend;
    });

    onPetUpdate(updatedPet);
    setFriends(updatedFriends);
    alert('선물을 주었습니다! 💝');
  };

  const handleCopyInvite = () => {
    const inviteUrl = `${window.location.origin}/?invite=${inviteCode}`;
    navigator.clipboard.writeText(inviteUrl);
    alert('초대 링크를 복사했습니다! 📋');
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2>👥 친구</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Invite Section */}
        <div className={styles.section}>
          <button
            className={styles.inviteButton}
            onClick={() => setShowInvite(!showInvite)}
          >
            🔗 초대 링크 {showInvite ? '닫기' : '열기'}
          </button>

          {showInvite && (
            <div className={styles.inviteCard}>
              <p className={styles.inviteLabel}>나의 초대 코드</p>
              <div className={styles.inviteCode}>{inviteCode}</div>
              <button
                className={styles.copyButton}
                onClick={handleCopyInvite}
              >
                📋 복사하기
              </button>
              <p className={styles.inviteDesc}>
                이 링크를 친구에게 공유하면, 친구가 나의 클랜에 들어올 수 있어요!
              </p>
            </div>
          )}
        </div>

        {/* Friends List */}
        <div className={styles.friendsSection}>
          <h3 className={styles.sectionTitle}>
            내 친구 ({friends.length})
          </h3>

          {friends.length === 0 ? (
            <div className={styles.emptyState}>
              <p>친구가 없습니다. 초대 링크를 공유해보세요! 🌟</p>
            </div>
          ) : (
            <div className={styles.friendsList}>
              {friends.map((friend) => (
                <div key={friend.id} className={styles.friendCard}>
                  {/* Friend Info */}
                  <div className={styles.friendHeader}>
                    <div className={styles.friendName}>
                      <h4>{friend.name}</h4>
                      <p className={styles.petName}>{friend.petName}</p>
                    </div>
                    <div className={styles.friendLevel}>
                      Lv.{friend.petState.level}
                    </div>
                  </div>

                  {/* Pet Stats Summary */}
                  <div className={styles.petStats}>
                    <div className={styles.stat}>
                      <span className={styles.label}>배고픔</span>
                      <div className={styles.bar}>
                        <div
                          className={styles.fill}
                          style={{
                            width: `${friend.petState.hunger}%`,
                            backgroundColor: '#ff6b6b',
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.label}>피로도</span>
                      <div className={styles.bar}>
                        <div
                          className={styles.fill}
                          style={{
                            width: `${friend.petState.tiredness}%`,
                            backgroundColor: '#4ecdc4',
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.label}>청결도</span>
                      <div className={styles.bar}>
                        <div
                          className={styles.fill}
                          style={{
                            width: `${friend.petState.cleanliness}%`,
                            backgroundColor: '#45b7d1',
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.label}>행복도</span>
                      <div className={styles.bar}>
                        <div
                          className={styles.fill}
                          style={{
                            width: `${friend.petState.happiness}%`,
                            backgroundColor: '#f9ca24',
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Friendship Score */}
                  <div className={styles.friendshipSection}>
                    <div className={styles.scoreLabel}>우정 점수</div>
                    <div className={styles.scoreBar}>
                      <div
                        className={styles.scoreFill}
                        style={{ width: `${friend.friendshipScore}%` }}
                      ></div>
                    </div>
                    <div className={styles.scoreValue}>
                      {friend.friendshipScore}/100
                    </div>
                  </div>

                  {/* Visit Info */}
                  <div className={styles.visitInfo}>
                    {friend.lastVisitTime && (
                      <p className={styles.lastVisit}>
                        마지막 방문: {formatTime(friend.lastVisitTime)}
                      </p>
                    )}
                    <p className={styles.nextVisit}>
                      다음 방문: {formatCountdown(friend.nextVisitTime)}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className={styles.actions}>
                    <button
                      className={`${styles.button} ${styles.visit}`}
                      onClick={() => handleVisit(friend.id)}
                      disabled={Date.now() < friend.nextVisitTime}
                    >
                      🏠 방문
                    </button>
                    <button
                      className={`${styles.button} ${styles.gift}`}
                      onClick={() => handleGift(friend.id)}
                      disabled={pet.cash < 10}
                    >
                      🎁 선물 (10캐시)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
