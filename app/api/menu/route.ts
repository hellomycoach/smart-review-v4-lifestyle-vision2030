import { NextRequest, NextResponse } from 'next/server';
import { getMenuForInstance, MenuItem, MenuItemOptionGroup } from '../../order/[instance]/mockData';

const NOCODB_HOST = "srv821341.hstgr.cloud";
const NOCODB_PORT = 8086;
const NOCODB_TOKEN = "nc_pat_6hZw4JgAjaFFfNbC7ui1IP4nuCi1mWWWq816JqFs";
const MENU_TABLE_ID = "mo1b63dokvbmjyg";
const RESTAURANTS_TABLE_ID = "mnq99g2rb63ja4i";

interface StoreStatus {
  isOpen: boolean;
  reason: string;
  message: string;
  openingTime: string;
  closingTime: string;
  timezone: string;
}

// Vérifie si le restaurant est actuellement dans ses horaires d'ouverture
function checkStoreOpenStatus(isAcceptingOrders: any, openTimeStr?: string, closeTimeStr?: string, timeZone: string = 'Asia/Qatar'): StoreStatus {
  const safeOpen = openTimeStr || '08:00';
  const safeClose = closeTimeStr || '23:30';
  const safeTz = timeZone || 'Asia/Qatar';

  // 1. Interrupteur manuel prioritaire
  if (isAcceptingOrders === false || isAcceptingOrders === 0) {
    return {
      isOpen: false,
      reason: 'manual_closed',
      message: 'Service momentanément interrompu',
      openingTime: safeOpen,
      closingTime: safeClose,
      timezone: safeTz
    };
  }

  // 2. Horaires réguliers
  if (openTimeStr && closeTimeStr) {
    try {
      const now = new Date();
      // Heure locale dans le fuseau du restaurant (ex: Asia/Qatar)
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: safeTz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const localTimeStr = formatter.format(now); // "HH:MM"
      const [currH, currM] = localTimeStr.split(':').map(Number);
      const currentMinutes = currH * 60 + currM;

      const [openH, openM] = safeOpen.split(':').map(Number);
      const openMinutes = openH * 60 + openM;

      const [closeH, closeM] = safeClose.split(':').map(Number);
      const closeMinutes = closeH * 60 + closeM;

      // Cas standard (ex: 08:00 à 23:30)
      if (openMinutes <= closeMinutes) {
        if (currentMinutes < openMinutes || currentMinutes >= closeMinutes) {
          return {
            isOpen: false,
            reason: 'outside_hours',
            message: `Cuisine fermée • Ouvre à ${safeOpen}`,
            openingTime: safeOpen,
            closingTime: safeClose,
            timezone: safeTz
          };
        }
      } else {
        // Cas service de nuit (ex: 18:00 à 02:00)
        if (currentMinutes < openMinutes && currentMinutes >= closeMinutes) {
          return {
            isOpen: false,
            reason: 'outside_hours',
            message: `Cuisine fermée • Ouvre à ${safeOpen}`,
            openingTime: safeOpen,
            closingTime: safeClose,
            timezone: safeTz
          };
        }
      }
    } catch (e) {
      console.error('Erreur vérification fuseau/horaires:', e);
    }
  }

  return {
    isOpen: true,
    reason: 'open',
    message: 'Service ouvert',
    openingTime: safeOpen,
    closingTime: safeClose,
    timezone: safeTz
  };
}

// Vérifie les plages horaires spécifiques par catégorie (ex: Breakfast 08:00 - 11:00 à Riwaq)
function getCategoryServiceHours(instance: string, categoryId: string, timezone: string = 'Asia/Qatar'): { isAvailable: boolean; serviceHours?: string } {
  if (!instance.includes('riwaq') && !instance.includes('qnl')) {
    return { isAvailable: true };
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const parts = formatter.format(new Date()).split(':').map(Number);
    const currMin = parts[0] * 60 + parts[1];

    if (categoryId === 'breakfast') {
      const open = 8 * 60;
      const close = 11 * 60;
      const isOpen = currMin >= open && currMin < close;
      return {
        isAvailable: isOpen,
        serviceHours: isOpen ? undefined : '08:00 - 11:00 AM'
      };
    }

    if (categoryId === 'salads_wraps') {
      const open = 10 * 60;
      const close = 19 * 60;
      const isOpen = currMin >= open && currMin < close;
      return {
        isAvailable: isOpen,
        serviceHours: isOpen ? undefined : 'Dès 10:00 / From 10:00'
      };
    }

    if (['appetizers', 'pizzas', 'mains', 'burgers_pasta'].includes(categoryId)) {
      const open = 11 * 60;
      const close = 19 * 60;
      const isOpen = currMin >= open && currMin < close;
      return {
        isAvailable: isOpen,
        serviceHours: isOpen ? undefined : 'Dès 11:00 / From 11:00'
      };
    }

    return { isAvailable: true };
  } catch (e) {
    return { isAvailable: true };
  }
}

// API Route dynamique connectée en direct à NocoDB avec fallback
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawInstance = searchParams.get('instance') || 'bos_cafe_moq';
  const cleanInstance = rawInstance.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

  let storeStatus: StoreStatus = {
    isOpen: true,
    reason: 'open',
    message: 'Service ouvert',
    openingTime: '08:00',
    closingTime: '23:30',
    timezone: 'Asia/Qatar'
  };
  let restaurantInfo: any = null;

  try {
    // 0. Récupérer les informations du restaurant et ses horaires dans NocoDB
    try {
      const restRes = await fetch(
        `http://${NOCODB_HOST}:${NOCODB_PORT}/api/v2/tables/${RESTAURANTS_TABLE_ID}/records?where=(instance_name,eq,${cleanInstance})&limit=1`,
        {
          headers: { 'xc-token': NOCODB_TOKEN },
          cache: 'no-store'
        }
      );
      if (restRes.ok) {
        const restData = await restRes.json();
        const records = Array.isArray(restData) ? restData : (restData.list || []);
        if (records.length > 0) {
          const r = records[0];
          restaurantInfo = {
            name: r.restaurant_name,
            city: r.city,
            country: r.country,
            currency: r.currency,
            coverImage: r.cover_image,
            logoUrl: r.logo_url,
            primaryColor: r.primary_color
          };
          storeStatus = checkStoreOpenStatus(
            r.is_accepting_orders,
            r.opening_time,
            r.closing_time,
            r.timezone || 'Asia/Qatar'
          );
        }
      }
    } catch (err) {
      console.error('Erreur lecture restaurant NocoDB:', err);
    }

    // 1. Tenter la lecture en temps réel depuis NocoDB des articles de menu
    const nocoRes = await fetch(
      `http://${NOCODB_HOST}:${NOCODB_PORT}/api/v2/tables/${MENU_TABLE_ID}/records?where=(instance_name,eq,${cleanInstance})&limit=100&t=${Date.now()}`,
      {
        headers: {
          'xc-token': NOCODB_TOKEN
        },
        cache: 'no-store'
      }
    );

    if (nocoRes.ok) {
      const nocoData = await nocoRes.json();
      const nocoList = Array.isArray(nocoData) ? nocoData : (nocoData.list || []);

      if (nocoList.length > 0) {
        const localMenu = getMenuForInstance(cleanInstance);
        
        // Mapper les données NocoDB au format MenuItem avec gestion des plages horaires de catégorie
        const items: MenuItem[] = nocoList.map((row: any) => {
          const localItem = localMenu.items.find(i => i.id === row.item_id);
          const catId = row.category || 'all';
          const catSchedule = getCategoryServiceHours(cleanInstance, catId, storeStatus.timezone);
          const rawAvailable = row.is_available !== 0 && row.is_available !== false;
          const isItemAvailable = rawAvailable && catSchedule.isAvailable;

          return {
            id: row.item_id || `item-${row.Id}`,
            categoryId: catId,
            name: {
              ar: row.name_ar || row.Title || '',
              fr: row.name_fr || row.Title || '',
              en: row.name_en || row.Title || ''
            },
            description: {
              ar: row.description_ar || '',
              fr: row.description_fr || '',
              en: row.description_en || ''
            },
            price: Number(row.price) || 0,
            image: row.image_url || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
            calories: Number(row.calories) || undefined,
            prepTime: row.prep_time || '3-5 min',
            isChefPick: row.is_chef_pick === 1 || row.is_chef_pick === true,
            isPopular: row.is_popular === 1 || row.is_popular === true,
            isAvailable: isItemAvailable,
            serviceHours: catSchedule.serviceHours,
            optionGroups: localItem?.optionGroups
          };
        });

        return NextResponse.json({
          success: true,
          source: 'nocodb_live',
          instance: cleanInstance,
          storeStatus,
          restaurant: restaurantInfo ? { ...localMenu.restaurantInfo, ...restaurantInfo, isOpen: storeStatus.isOpen } : localMenu.restaurantInfo,
          categories: localMenu.categories,
          total_items: items.length,
          items
        });
      }
    }
  } catch (error) {
    console.error("NocoDB fetch failed, falling back to local:", error);
  }

  // 2. Fallback local si NocoDB est vide ou indisponible
  const menuData = getMenuForInstance(cleanInstance);
  const itemsWithSchedule = menuData.items.map(item => {
    const catSchedule = getCategoryServiceHours(cleanInstance, item.categoryId, storeStatus.timezone);
    return {
      ...item,
      isAvailable: (item.isAvailable !== false) && catSchedule.isAvailable,
      serviceHours: catSchedule.serviceHours
    };
  });

  return NextResponse.json({
    success: true,
    source: 'local_fallback',
    instance: cleanInstance,
    storeStatus,
    restaurant: restaurantInfo ? { ...menuData.restaurantInfo, ...restaurantInfo, isOpen: storeStatus.isOpen } : menuData.restaurantInfo,
    categories: menuData.categories,
    total_items: itemsWithSchedule.length,
    items: itemsWithSchedule
  });
}
