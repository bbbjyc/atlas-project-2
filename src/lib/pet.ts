import { Pet } from '@/types/pet';

export function createPet(name: string, userId: string): Pet {
  const now = Math.floor(Date.now() / 1000);
  const petId = `pet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    petId,
    name,
    userId,

    level: 1,
    exp: 0,

    hunger: 50,
    tiredness: 30,
    cleanliness: 70,
    happiness: 60,

    isAwake: true,

    outfit: 'basic',
    backgroundColor: 'white',
    furniture: [],

    cash: 100,

    createdAt: now,
    lastFeedTime: now,
    lastPlayTime: now,
    lastCashRecoveryTime: now,
    sleepStartTime: null,
    updatedAt: now,

    friends: [],
    friendshipScores: {},
    lastVisitTime: {},
  };
}

export function getMyLevel(playerId: string): number {
  // TODO: Fetch care_logs count from database
  // careLogsCount / 10 = level
  return 1;
}

export function addCareLog(playerId: string, actionType: 'feed' | 'clean' | 'shower'): any {
  // TODO: Add care_log to database
  return {};
}

export function getCashBalance(playerId: string): number {
  // TODO: Sum all cash_logs amounts for this player
  return 0;
}
