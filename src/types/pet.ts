export interface Pet {
  petId: string;
  name: string;
  userId: string;

  level: number;
  exp: number;

  hunger: number;
  tiredness: number;
  cleanliness: number;
  happiness: number;

  isAwake: boolean;

  outfit: string;
  backgroundColor: string;
  furniture: string[];

  cash: number;

  createdAt: number;
  lastFeedTime: number;
  lastPlayTime: number;
  lastCashRecoveryTime: number;
  sleepStartTime: number | null;
  updatedAt: number;

  friends: string[];
  friendshipScores: Record<string, number>;
  lastVisitTime: Record<string, number>;
}

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  description: string;
}

export interface ShopData {
  outfit: ShopItem[];
  background: ShopItem[];
  furniture: ShopItem[];
}
