import { supabase } from "./supabase";

// plan.md: 레벨 = 내 care_logs 행 수 ÷ 10
// TODO: 조원영님의 getMyLevel(src/lib/pet.ts)이 merge되면 getLevel 대신 그걸 쓴다
const CARE_LOGS_PER_LEVEL = 10;

async function getLevel(playerId: number): Promise<number> {
  const { count, error } = await supabase
    .from("care_logs")
    .select("id", { count: "exact", head: true })
    .eq("player_id", playerId);

  if (error) throw new Error(`레벨을 계산하지 못했어요: ${error.message}`);
  return Math.floor((count ?? 0) / CARE_LOGS_PER_LEVEL);
}

export type BattleLog = {
  id: number;
  created_at: string;
  attacker_id: number;
  defender_id: number;
  winner_id: number;
  clan_id: number;
};

// 두 사람의 레벨을 비교해 승패를 정하고 battle_logs에 한 줄 추가한다.
// 레벨이 같으면 방어한 사람이 이긴다. clan_id는 이긴 사람의 클랜이다.
export async function startBattle(
  attackerId: number,
  defenderId: number
): Promise<BattleLog> {
  if (attackerId === defenderId) {
    throw new Error("자기 자신과는 대전할 수 없어요.");
  }

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, clan_id")
    .in("id", [attackerId, defenderId]);

  if (playersError) {
    throw new Error(`플레이어를 불러오지 못했어요: ${playersError.message}`);
  }

  const attacker = players?.find((p) => p.id === attackerId);
  const defender = players?.find((p) => p.id === defenderId);
  if (!attacker || !defender) {
    throw new Error("대전할 플레이어를 찾을 수 없어요.");
  }

  const [attackerLevel, defenderLevel] = await Promise.all([
    getLevel(attackerId),
    getLevel(defenderId),
  ]);

  const attackerWins = attackerLevel > defenderLevel;
  const winner = attackerWins ? attacker : defender;

  const { data, error } = await supabase
    .from("battle_logs")
    .insert({
      attacker_id: attackerId,
      defender_id: defenderId,
      winner_id: winner.id,
      clan_id: winner.clan_id,
    })
    .select()
    .single();

  if (error) throw new Error(`대전 결과를 저장하지 못했어요: ${error.message}`);
  return data as BattleLog;
}
