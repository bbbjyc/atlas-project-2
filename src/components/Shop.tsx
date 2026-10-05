'use client';

import { useState, useEffect } from 'react';
import { Pet, ShopData } from '@/types/pet';
import styles from './Shop.module.css';

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
      <div className={styles.container}>
        <div className={styles.content}>
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!shopData) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <p>상점 데이터를 불러올 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const items = shopData[activeTab];
  const getItemId = (index: number): string => {
    return `${activeTab}_${String(index + 1).padStart(3, '0')}`;
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2>🛍️ 상점</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Cash Display */}
        <div className={styles.cashDisplay}>
          <span className={styles.cashIcon}>💰</span>
          <span className={styles.cashAmount}>{pet.cash}</span>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'outfit' ? styles.active : ''}`}
            onClick={() => setActiveTab('outfit')}
          >
            👗 의류
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'background' ? styles.active : ''}`}
            onClick={() => setActiveTab('background')}
          >
            🎨 배경
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'furniture' ? styles.active : ''}`}
            onClick={() => setActiveTab('furniture')}
          >
            🛋️ 가구
          </button>
        </div>

        {/* Items Grid */}
        <div className={styles.itemsGrid}>
          {items.map((item, index) => {
            const itemId = getItemId(index);
            const isOwned = ownedItems.has(itemId);
            const isEquipped =
              (activeTab === 'outfit' && pet.outfit === item.id) ||
              (activeTab === 'background' && pet.backgroundColor === item.id);

            return (
              <div key={item.id} className={styles.itemCard}>
                <div className={styles.itemImage}>
                  {activeTab === 'outfit' && '👗'}
                  {activeTab === 'background' && '🎨'}
                  {activeTab === 'furniture' && '🛋️'}
                </div>

                <div className={styles.itemInfo}>
                  <h3 className={styles.itemName}>{item.name}</h3>
                  <p className={styles.itemDescription}>{item.description}</p>
                  <p className={styles.itemPrice}>{item.price}캐시</p>
                </div>

                <div className={styles.itemAction}>
                  {!isOwned ? (
                    <button
                      className={`${styles.button} ${styles.purchase}`}
                      onClick={() =>
                        handlePurchase(itemId, item.price, activeTab)
                      }
                      disabled={pet.cash < item.price}
                    >
                      구매
                    </button>
                  ) : isEquipped ? (
                    <button className={`${styles.button} ${styles.equipped}`} disabled>
                      ✓ 장착
                    </button>
                  ) : (
                    <button
                      className={`${styles.button} ${styles.equip}`}
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
