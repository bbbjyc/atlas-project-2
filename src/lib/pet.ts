import { supabase } from '@/lib/supabase';
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
    lastUpdateTime: now,
    sleepStartTime: null,
    updatedAt: now,

    friends: [],
    friendshipScores: {},
    lastVisitTime: {},
  };
}

/**
 * 플레이어의 펫 레벨 계산 (care_logs 행 수 ÷ 10)
 * plan.md: "레벨 = 내 care_logs 행 수 ÷ 10"
 */
export async function getMyLevel(playerId: string): Promise<number> {
  const { count, error } = await supabase
    .from('care_logs')
    .select('*', { count: 'exact', head: true })
    .eq('player_id', parseInt(playerId));

  if (error) {
    console.error('Failed to fetch care_logs:', error);
    return 1;
  }

  return Math.floor((count ?? 0) / 10);
}

/**
 * 돌봄 행동 기록 추가 (care_logs에 새 행 추가)
 * plan.md: "돌봄 행동을 care_logs에 추가"
 */
export async function addCareLog(
  playerId: string,
  actionType: 'feed' | 'clean' | 'shower' | 'sleep' | 'play'
): Promise<any> {
  const { data, error } = await supabase
    .from('care_logs')
    .insert([
      {
        player_id: parseInt(playerId),
        action_type: actionType,
        created_at: new Date().toISOString(),
      },
    ])
    .select();

  if (error) {
    console.error('Failed to add care log:', error);
    return null;
  }

  return data?.[0] || null;
}

