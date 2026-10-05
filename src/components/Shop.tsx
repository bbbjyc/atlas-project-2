'use client';

import { useState, useEffect } from 'react';
import { Pet, ShopData } from '@/types/pet';

interface ShopProps {
  pet: Pet;
  onPetUpdate: (pet: Pet) => void;
  onClose: () => void;
}

type TabType = 'outfit' | 'background' | 'furniture';

export default function Shop({ pet, onPetUpdate, onClose }: ShopProps) {
  const [activeTab, setActiveTab] = useState<TabType>('outfit');
  const [shopData, setShopData] = useState<ShopData | null>(null);
  const [ownedItems, setOwnedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Load shop data
  useEffect(() => {
    const loadShopData = async () => {
      try {
        const response = await fetch('/shopData.json');
        const data = await response.json();
        setShopData(data);
      } catch (error) {
        console.error('Failed to load shop data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadShopData();
  }, []);

  // Track owned items (for demo: assume all are owned if in pet's data)
  useEffect(() => {
    const owned = new Set<string>();
    if (pet.outfit !== 'basic') owned.add(`outfit_${pet.outfit}`);
    if (pet.backgroundColor !== 'white') owned.add(`bg_${pet.backgroundColor}`);
    pet.furniture.forEach((furn) => owned.add(`furn_${furn}`));
    setOwnedItems(owned);
  }, [pet]);

  const handlePurchase = (itemId: string, price: number, type: TabType) => {
    if (pet.cash < price) {
      alert('캐시가 부족합니다!');
      return;
    }

    if (ownedItems.has(itemId)) {
      alert('이미 가진 아이템입니다!');
      return;
    }

    // Deduct cash
    const updatedPet = { ...pet, cash: pet.cash - price };

    // Add to owned items based on type
    switch (type) {
      case 'outfit':
        // In a real app, would add to player's outfit list
        break;
      case 'background':
        // In a real app, would add to player's background list
        break;
      case 'furniture':
        updatedPet.furniture = [...updatedPet.furniture, itemId.replace('furn_', '')];
        break;
    }

    setOwnedItems((prev) => new Set(prev).add(itemId));
    onPetUpdate(updatedPet);
    alert('구매 완료! 🎉');
  };

  const handleEquip = (itemId: string, type: TabType) => {
    const updatedPet = { ...pet };

    switch (type) {
      case 'outfit':
        updatedPet.outfit = itemId.replace('outfit_', '');
        break;
      case 'background':
        updatedPet.backgroundColor = itemId.replace('bg_', '');
        break;
    }

    onPetUpdate(updatedPet);
    alert('장착 완료! ✨');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-5 animate-fadeIn">
        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-modal animate-slideUp">
          <p className="p-5 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!shopData) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-5 animate-fadeIn">
        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-modal animate-slideUp">
          <p className="p-5 text-gray-600">상점 데이터를 불러올 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const items = shopData[activeTab];
  const getItemId = (index: number): string => {
    return `${activeTab}_${String(index + 1).padStart(3, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-5 animate-fadeIn" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-modal animate-slideUp" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 m-0">🛍️ 상점</h2>
          <button
            className="bg-none border-none text-2xl cursor-pointer text-gray-600 hover:text-gray-900 transition-colors p-0 w-9 h-9 flex items-center justify-center"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Cash Display */}
        <div className="flex items-center gap-2 p-3 bg-gray-100 font-bold border-b border-gray-200">
          <span className="text-xl">💰</span>
          <span className="text-lg text-primary">{pet.cash}</span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-white">
          <button
            className={`flex-1 p-4 font-bold text-sm cursor-pointer transition-all border-b-4 ${
              activeTab === 'outfit'
                ? 'text-primary border-b-primary'
                : 'text-gray-600 border-b-transparent hover:text-primary'
            }`}
            onClick={() => setActiveTab('outfit')}
          >
            👗 의류
          </button>
          <button
            className={`flex-1 p-4 font-bold text-sm cursor-pointer transition-all border-b-4 ${
              activeTab === 'background'
                ? 'text-primary border-b-primary'
                : 'text-gray-600 border-b-transparent hover:text-primary'
            }`}
            onClick={() => setActiveTab('background')}
          >
            🎨 배경
          </button>
          <button
            className={`flex-1 p-4 font-bold text-sm cursor-pointer transition-all border-b-4 ${
              activeTab === 'furniture'
                ? 'text-primary border-b-primary'
                : 'text-gray-600 border-b-transparent hover:text-primary'
            }`}
            onClick={() => setActiveTab('furniture')}
          >
            🛋️ 가구
          </button>
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {items.map((item, index) => {
            const itemId = getItemId(index);
            const isOwned = ownedItems.has(itemId);
            const isEquipped =
              (activeTab === 'outfit' && pet.outfit === item.id) ||
              (activeTab === 'background' && pet.backgroundColor === item.id);

            return (
              <div
                key={item.id}
                className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex gap-3 hover:border-primary hover:shadow-card transition-all"
              >
                <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center text-4xl flex-shrink-0 border border-gray-200">
                  {activeTab === 'outfit' && '👗'}
                  {activeTab === 'background' && '🎨'}
                  {activeTab === 'furniture' && '🛋️'}
                </div>

                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 m-0">
                    {item.name}
                  </h3>
                  <p className="text-xs text-gray-600 line-clamp-2 mt-1 m-0">
                    {item.description}
                  </p>
                  <p className="text-sm font-bold text-primary mt-1 m-0">
                    {item.price}캐시
                  </p>
                </div>

                <div className="flex items-center flex-shrink-0">
                  {!isOwned ? (
                    <button
                      className="px-4 py-2 bg-primary text-white border border-primary rounded-lg font-bold text-xs cursor-pointer transition-all hover:enabled:-translate-y-0.5 hover:enabled:shadow-card active:enabled:translate-y-0 disabled:bg-gray-400 disabled:border-gray-400 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() =>
                        handlePurchase(itemId, item.price, activeTab)
                      }
                      disabled={pet.cash < item.price}
                    >
                      구매
                    </button>
                  ) : isEquipped ? (
                    <button
                      className="px-4 py-2 bg-blue-50 text-primary border border-primary rounded-lg font-bold text-xs cursor-default"
                      disabled
                    >
                      ✓ 장착
                    </button>
                  ) : (
                    <button
                      className="px-4 py-2 bg-white text-primary border border-primary rounded-lg font-bold text-xs cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-card active:translate-y-0"
                      onClick={() => handleEquip(itemId, activeTab)}
                    >
                      장착
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
