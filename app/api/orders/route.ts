import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

const N8N_CREATE_ORDER_API = "https://n8n.srv821341.hstgr.cloud/webhook/create-table-order";
const N8N_UPDATE_STATUS_API = "https://n8n.srv821341.hstgr.cloud/webhook/update-order-status";

// Double persistance : dans le répertoire OS (/tmp) qui survit aux git pull / npm run build + dans le projet
const PRIMARY_DB_FILE = path.join(os.tmpdir(), 'sr_orders_db_v5.json');
const SECONDARY_DB_FILE = path.join(process.cwd(), '.orders_db.json');

interface StoredOrder {
  order_id: string;
  instance_name: string;
  restaurant_name: string;
  table_number: string;
  customer_phone?: string;
  customer_email?: string;
  customer_name?: string;
  items: any[];
  subtotal: number;
  tip?: number;
  total_amount: number;
  currency: string;
  payment_method: string;
  status: 'recue' | 'en_cuisine' | 'prete' | 'servie';
  timestamp: string;
}

// Helpers lecture/écriture persistante protégée
function getStoredOrders(): StoredOrder[] {
  // 1. Essayer depuis le stockage système /tmp (persistant aux redéploiements)
  try {
    if (fs.existsSync(PRIMARY_DB_FILE)) {
      const data = fs.readFileSync(PRIMARY_DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  // 2. Essayer depuis le fichier local projet
  try {
    if (fs.existsSync(SECONDARY_DB_FILE)) {
      const data = fs.readFileSync(SECONDARY_DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  return [];
}

function saveStoredOrders(orders: StoredOrder[]) {
  const jsonStr = JSON.stringify(orders.slice(0, 200), null, 2);
  
  // Écrire dans /tmp (survit à npm run build et git pull)
  try {
    fs.writeFileSync(PRIMARY_DB_FILE, jsonStr, 'utf-8');
  } catch (e) {}

  // Écrire dans le projet
  try {
    fs.writeFileSync(SECONDARY_DB_FILE, jsonStr, 'utf-8');
  } catch (e) {}
}

const NOCODB_HOST = "srv821341.hstgr.cloud";
const NOCODB_PORT = 8086;
const NOCODB_TOKEN = "nc_pat_6hZw4JgAjaFFfNbC7ui1IP4nuCi1mWWWq816JqFs";
const RESTAURANTS_TABLE_ID = "mnq99g2rb63ja4i";
const ORDERS_TABLE_ID = "mni5io8ofzftnc4";

// Récupérer les commandes depuis NocoDB
async function fetchNocoOrders(instance?: string): Promise<StoredOrder[]> {
  try {
    let url = `http://${NOCODB_HOST}:${NOCODB_PORT}/api/v2/tables/${ORDERS_TABLE_ID}/records?limit=200&sort=-Id`;
    if (instance) {
      url += `&where=(instance_name,eq,${instance.trim().toLowerCase()})`;
    }
    const res = await fetch(url, {
      headers: { 'xc-token': NOCODB_TOKEN },
      cache: 'no-store'
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.list || []);

    return list.map((r: any) => {
      let parsedItems = [];
      try {
        parsedItems = typeof r.items_json === 'string' ? JSON.parse(r.items_json) : (r.items_json || []);
      } catch (e) {}

      return {
        order_id: r.order_id || `SR-${r.Id}`,
        instance_name: r.instance_name || 'bos_cafe_moq',
        restaurant_name: r.restaurant_name || "Bo's Coffee",
        table_number: String(r.table_number || '01'),
        customer_phone: r.customer_phone || '',
        customer_email: r.customer_email || '',
        customer_name: r.customer_name || 'Guest',
        items: parsedItems,
        subtotal: Number(r.total_amount) || 0,
        tip: 0,
        total_amount: Number(r.total_amount) || 0,
        currency: r.currency || 'QAR',
        payment_method: r.payment_method || 'apple_pay',
        status: (r.status as any) || 'recue',
        timestamp: r.CreatedAt || new Date().toISOString()
      };
    });
  } catch (err) {
    return [];
  }
}

// GET /api/orders?instance=doha_pilot OU /api/orders?orderId=SR-123456
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const instance = searchParams.get('instance')?.toLowerCase();
  const orderId = searchParams.get('orderId');

  const localOrders = getStoredOrders();
  let nocoOrders: StoredOrder[] = [];

  try {
    nocoOrders = await fetchNocoOrders(instance);
  } catch (e) {}

  // Fusionner les commandes locales et NocoDB sans doublons
  const orderMap = new Map<string, StoredOrder>();
  localOrders.forEach(o => orderMap.set(o.order_id.toLowerCase(), o));
  nocoOrders.forEach(o => {
    if (!orderMap.has(o.order_id.toLowerCase())) {
      orderMap.set(o.order_id.toLowerCase(), o);
    }
  });

  const allOrders = Array.from(orderMap.values()).sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // Si on cherche le statut d'une commande précise (pour le smartphone client)
  if (orderId) {
    const order = allOrders.find(o => o.order_id.toLowerCase() === orderId.toLowerCase());
    if (order) {
      return NextResponse.json({ success: true, order });
    }
    return NextResponse.json({ success: true, order: { order_id: orderId, status: 'recue' } });
  }

  // Si on cherche les commandes d'une instance pour l'écran cuisine KDS / Manager
  if (instance) {
    const filtered = allOrders.filter(o => 
      o.instance_name.toLowerCase().includes(instance) || instance.includes(o.instance_name.toLowerCase())
    );
    return NextResponse.json({ success: true, orders: filtered });
  }

  return NextResponse.json({ success: true, orders: allOrders });
}

// Vérification serveur si les commandes sont acceptées
async function verifyStoreIsOpen(instanceName: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const cleanInstance = instanceName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const res = await fetch(
      `http://${NOCODB_HOST}:${NOCODB_PORT}/api/v2/tables/${RESTAURANTS_TABLE_ID}/records?where=(instance_name,eq,${cleanInstance})&limit=1`,
      {
        headers: { 'xc-token': NOCODB_TOKEN },
        cache: 'no-store'
      }
    );
    if (!res.ok) return { allowed: true }; // En cas d'indisponibilité réseau, autoriser par secours
    const data = await res.json();
    const records = Array.isArray(data) ? data : (data.list || []);
    if (records.length === 0) return { allowed: true };

    const r = records[0];

    // 1. Interrupteur manuel
    if (r.is_accepting_orders === false || r.is_accepting_orders === 0) {
      return { allowed: false, reason: "Le restaurant n'accepte pas de commandes actuellement (fermeture manuelle)." };
    }

    // 2. Horaires réguliers
    if (r.opening_time && r.closing_time) {
      const timeZone = r.timezone || 'Asia/Qatar';
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const localTimeStr = formatter.format(new Date());
      const [currH, currM] = localTimeStr.split(':').map(Number);
      const currentMinutes = currH * 60 + currM;

      const [openH, openM] = r.opening_time.split(':').map(Number);
      const openMinutes = openH * 60 + openM;

      const [closeH, closeM] = r.closing_time.split(':').map(Number);
      const closeMinutes = closeH * 60 + closeM;

      if (openMinutes <= closeMinutes) {
        if (currentMinutes < openMinutes || currentMinutes >= closeMinutes) {
          return { allowed: false, reason: `Cuisine fermée. Horaires : ${r.opening_time} - ${r.closing_time} (${timeZone})` };
        }
      } else {
        if (currentMinutes < openMinutes && currentMinutes >= closeMinutes) {
          return { allowed: false, reason: `Cuisine fermée. Horaires : ${r.opening_time} - ${r.closing_time} (${timeZone})` };
        }
      }
    }

    return { allowed: true };
  } catch (err) {
    console.error('Erreur vérification horaire serveur:', err);
    return { allowed: true };
  }
}

// POST /api/orders (Création d'une nouvelle commande par le client)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const instance = (body.instance_name || 'bos_cafe_moq').toLowerCase();

    // VÉRIFICATION ANTI-FRAUDE SERVEUR : Le restaurant est-il ouvert ?
    const check = await verifyStoreIsOpen(instance);
    if (!check.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'STORE_CLOSED', 
          message: check.reason || "La cuisine est actuellement fermée pour la prise de commandes." 
        }, 
        { status: 403 }
      );
    }

    const newOrder: StoredOrder = {
      order_id: body.order_id || `SR-${Math.floor(100000 + Math.random() * 900000)}`,
      instance_name: instance,
      restaurant_name: body.restaurant_name || 'Lusail Courtyard Café',
      table_number: String(body.table_number || '01'),
      customer_phone: body.customer_phone || '',
      customer_email: body.customer_email || '',
      customer_name: body.customer_name || 'Guest',
      items: body.items || [],
      subtotal: Number(body.subtotal) || 0,
      tip: Number(body.tip) || 0,
      total_amount: Number(body.total_amount) || 0,
      currency: body.currency || 'QAR',
      payment_method: body.payment_method || 'counter',
      status: 'recue',
      timestamp: body.timestamp || new Date().toISOString()
    };

    const orders = getStoredOrders();
    const existingIdx = orders.findIndex(o => o.order_id === newOrder.order_id);
    if (existingIdx >= 0) {
      orders[existingIdx] = newOrder;
    } else {
      orders.unshift(newOrder);
    }
    saveStoredOrders(orders);

    // Relais au webhook n8n (NocoDB + WhatsApp)
    fetch(N8N_CREATE_ORDER_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder)
    }).catch(e => console.log('Relais n8n en tâche de fond:', e));

    return NextResponse.json({ success: true, order: newOrder });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH /api/orders (Mise à jour du statut par la cuisine)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { order_id, status } = body;

    if (!order_id || !status) {
      return NextResponse.json({ success: false, error: 'order_id et status requis' }, { status: 400 });
    }

    const orders = getStoredOrders();
    const order = orders.find(o => o.order_id === order_id);
    if (order) {
      order.status = status;
    } else {
      orders.unshift({
        order_id,
        instance_name: body.instance_name || 'doha_pilot',
        restaurant_name: body.restaurant_name || '',
        table_number: String(body.table_number || ''),
        items: [],
        subtotal: 0,
        total_amount: 0,
        currency: 'QAR',
        payment_method: 'counter',
        status: status,
        timestamp: new Date().toISOString()
      });
    }
    saveStoredOrders(orders);

    // Relais à n8n pour mise à jour NocoDB
    fetch(N8N_UPDATE_STATUS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id, status })
    }).catch(() => {});

    return NextResponse.json({ success: true, order_id, status });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
