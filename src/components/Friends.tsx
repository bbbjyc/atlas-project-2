'use client';

import { useState, useEffect } from 'react';
import { Pet } from '@/types/pet';
import { addCashLog } from '@/lib/pet';

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

  const handleGift = async (friendId: string) => {
    if (pet.cash < 10) {
      alert('캐시가 부족합니다!');
      return;
    }

    const playerId = typeof window !== 'undefined' ? localStorage.getItem('currentUserId') : null;
    if (!playerId) {
      alert('사용자 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      await addCashLog(playerId, -10, 'gift');
    } catch (error) {
      console.error('Failed to record gift:', error);
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-5 animate-fadeIn" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-modal animate-slideUp" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 m-0">👥 친구</h2>
          <button
            className="bg-none border-none text-2xl cursor-pointer text-gray-600 hover:text-gray-900 transition-colors p-0 w-9 h-9 flex items-center justify-center"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Invite Section */}
        <div className="p-3 border-b border-gray-200">
          <button
            className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-lg cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
            onClick={() => setShowInvite(!showInvite)}
          >
            🔗 초대 링크 {showInvite ? '닫기' : '열기'}
          </button>

          {showInvite && (
            <div className="bg-gray-100 rounded-lg p-3 mt-3 border border-gray-200">
              <p className="text-xs text-gray-600 mb-2 font-bold m-0">나의 초대 코드</p>
              <div className="bg-white border border-gray-200 rounded-lg p-2.5 font-mono text-xs text-gray-900 text-center break-all mb-2">
                {inviteCode}
              </div>
              <button
                className="w-full py-2 bg-white border border-primary text-primary rounded-lg font-bold text-xs cursor-pointer transition-all hover:bg-blue-50"
                onClick={handleCopyInvite}
              >
                📋 복사하기
              </button>
              <p className="text-xs text-gray-600 mt-2 m-0 leading-relaxed">
                이 링크를 친구에게 공유하면, 친구가 나의 클랜에 들어올 수 있어요!
              </p>
            </div>
          )}
        </div>

        {/* Friends List */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm text-gray-600 font-bold mb-3 m-0">
            내 친구 ({friends.length})
          </h3>

          {friends.length === 0 ? (
            <div className="text-center py-10 text-gray-600">
              <p className="text-sm m-0">친구가 없습니다. 초대 링크를 공유해보세요! 🌟</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {friends.map((friend) => (
                <div key={friend.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3 hover:border-primary hover:shadow-card transition-all">
                  {/* Friend Header */}
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 m-0">
                        {friend.name}
                      </h4>
                      <p className="text-xs text-gray-600 mt-0.5 m-0">
                        {friend.petName}
                      </p>
                    </div>
                    <div className="text-xs font-bold text-primary bg-blue-50 px-2 py-1 rounded">
                      Lv.{friend.petState.level}
                    </div>
                  </div>

                  {/* Pet Stats Summary */}
                  <div className="flex flex-col gap-1.5 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 font-bold min-w-12">
                        배고픔
                      </span>
                      <div className="flex-1 h-1.5 bg-gray-300 rounded-full overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${friend.petState.hunger}%`,
                            backgroundColor: '#ff6b6b',
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 font-bold min-w-12">
                        피로도
                      </span>
                      <div className="flex-1 h-1.5 bg-gray-300 rounded-full overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${friend.petState.tiredness}%`,
                            backgroundColor: '#4ecdc4',
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 font-bold min-w-12">
                        청결도
                      </span>
                      <div className="flex-1 h-1.5 bg-gray-300 rounded-full overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${friend.petState.cleanliness}%`,
                            backgroundColor: '#45b7d1',
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 font-bold min-w-12">
                        행복도
                      </span>
                      <div className="flex-1 h-1.5 bg-gray-300 rounded-full overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${friend.petState.happiness}%`,
                            backgroundColor: '#f9ca24',
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Friendship Score */}
                  <div className="bg-white rounded-lg p-2 mb-2">
                    <div className="text-xs text-gray-600 font-bold mb-1">우정 점수</div>
                    <div className="w-full h-2 bg-gray-300 rounded-full overflow-hidden mb-1">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-secondary transition-all"
                        style={{ width: `${friend.friendshipScore}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-primary font-bold text-right">
                      {friend.friendshipScore}/100
                    </div>
                  </div>

                  {/* Visit Info */}
                  <div className="text-xs text-gray-600 mb-2 leading-relaxed">
                    {friend.lastVisitTime && (
                      <p className="mb-1 m-0">
                        마지막 방문: {formatTime(friend.lastVisitTime)}
                      </p>
                    )}
                    <p className="text-primary font-bold m-0">
                      다음 방문: {formatCountdown(friend.nextVisitTime)}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      className="flex-1 py-2 bg-white text-primary border border-primary rounded-lg font-bold text-xs cursor-pointer transition-all hover:enabled:-translate-y-0.5 hover:enabled:shadow-card active:enabled:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleVisit(friend.id)}
                      disabled={Date.now() < friend.nextVisitTime}
                    >
                      🏠 방문
                    </button>
                    <button
                      className="flex-1 py-2 bg-white text-secondary border border-secondary rounded-lg font-bold text-xs cursor-pointer transition-all hover:enabled:-translate-y-0.5 hover:enabled:shadow-card active:enabled:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
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
