import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const NOCODB_HOST = "srv821341.hstgr.cloud";
const NOCODB_PORT = 8086;
const NOCODB_TOKEN = "nc_pat_6hZw4JgAjaFFfNbC7ui1IP4nuCi1mWWWq816JqFs";

const TABLES = {
  REVIEWS: "mqw391sapk15dji",     // Avis_Generes
  LOYALTY: "mf6bfp23nt9wzdh",     // Fidelite_Clients
  COUPONS: "maodjecat9aqle6",     // Coupons_Gagnes
  LEADS: "mowwx61li7jbd83",       // Leads_Wifi
  RESTAURANTS: "mnq99g2rb63ja4i"  // Restaurants
};

async function fetchNocoTable(tableId: string, limit: number = 500) {
  try {
    const url = `http://${NOCODB_HOST}:${NOCODB_PORT}/api/v2/tables/${tableId}/records?sort=-Id&limit=${limit}`;
    const res = await fetch(url, {
      headers: {
        'xc-token': NOCODB_TOKEN
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      console.error(`Erreur NocoDB pour table ${tableId}: HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : (data.list || []);
  } catch (err) {
    console.error(`Exception NocoDB pour table ${tableId}:`, err);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const [reviews, loyalty, coupons, leads, restaurants] = await Promise.all([
      fetchNocoTable(TABLES.REVIEWS, 1000),
      fetchNocoTable(TABLES.LOYALTY, 500),
      fetchNocoTable(TABLES.COUPONS, 500),
      fetchNocoTable(TABLES.LEADS, 1000),
      fetchNocoTable(TABLES.RESTAURANTS, 100)
    ]);

    return NextResponse.json({
      success: true,
      reviews,
      loyalty,
      coupons,
      leads,
      restaurants
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || "Erreur interne"
    }, { status: 500 });
  }
}
