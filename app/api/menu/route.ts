import { NextRequest, NextResponse } from 'next/server';
import { getMenuForInstance, MenuItem, MenuItemOptionGroup } from '../../order/[instance]/mockData';

const NOCODB_HOST = "srv821341.hstgr.cloud";
const NOCODB_PORT = 8086;
const NOCODB_TOKEN = "nc_pat_6hZw4JgAjaFFfNbC7ui1IP4nuCi1mWWWq816JqFs";
const MENU_TABLE_ID = "mo1b63dokvbmjyg";

// API Route dynamique connectée en direct à NocoDB avec fallback
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawInstance = searchParams.get('instance') || 'bos_cafe_moq';
  const cleanInstance = rawInstance.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

  try {
    // 1. Tenter la lecture en temps réel depuis NocoDB
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
        
        // Mapper les données NocoDB au format MenuItem
        const items: MenuItem[] = nocoList.map((row: any) => {
          // Trouver les options de taille si existantes dans le template local
          const localItem = localMenu.items.find(i => i.id === row.item_id);

          return {
            id: row.item_id || `item-${row.Id}`,
            categoryId: row.category || 'all',
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
            isAvailable: row.is_available !== 0 && row.is_available !== false,
            optionGroups: localItem?.optionGroups
          };
        });

        return NextResponse.json({
          success: true,
          source: 'nocodb_live',
          instance: cleanInstance,
          restaurant: localMenu.restaurantInfo,
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
  return NextResponse.json({
    success: true,
    source: 'local_fallback',
    instance: cleanInstance,
    restaurant: menuData.restaurantInfo,
    categories: menuData.categories,
    total_items: menuData.items.length,
    items: menuData.items
  });
}
