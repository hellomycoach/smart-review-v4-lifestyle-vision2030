import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getMenuForInstance } from '../../order/[instance]/mockData';

// API Route multi-restaurants isolée pour récupérer le menu complet par instance
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const instance = searchParams.get('instance') || 'bos_cafe_moq';

  try {
    const menuData = getMenuForInstance(instance);
    return NextResponse.json({
      success: true,
      instance: instance,
      restaurant: menuData.restaurantInfo,
      categories: menuData.categories,
      total_items: menuData.items.length,
      items: menuData.items
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Erreur chargement menu' },
      { status: 500 }
    );
  }
}
