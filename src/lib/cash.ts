import { supabase } from '@/lib/supabase';

/**
 * 플레이어의 현재 캐시 잔액 계산 (cash_logs의 amount 합계)
 * plan.md: "캐시 잔액 = 내 cash_logs의 amount 합계"
 */
export async function getCashBalance(playerId: string): Promise<number> {
  const { data, error } = await supabase
    .from('cash_logs')
    .select('amount')
    .eq('player_id', parseInt(playerId));

  if (error) {
    console.error('Failed to fetch cash logs:', error);
    return 0;
  }

  const balance = (data || []).reduce((sum, log) => sum + (log.amount || 0), 0);
  return balance;
}

/**
 * 캐시 로그 추가 (cash_logs에 새 행 추가)
 * plan.md: "reason: mission / purchase / feed / clean / shower / heal / gift / battle / buy_item"
 */
export async function addCashLog(
  playerId: string,
  amount: number,
  reason: 'mission' | 'purchase' | 'feed' | 'clean' | 'shower' | 'heal' | 'gift' | 'battle' | 'buy_item',
  itemName?: string,
  itemType?: 'outfit' | 'background' | 'furniture'
): Promise<any> {
  const { data, error } = await supabase
    .from('cash_logs')
    .insert([
      {
        player_id: parseInt(playerId),
        amount,
        reason,
        item: itemName || null,
        item_type: itemType || null,
        created_at: new Date().toISOString(),
      },
    ])
    .select();

  if (error) {
    console.error('Failed to add cash log:', error);
    return null;
  }

  return data?.[0] || null;
}
