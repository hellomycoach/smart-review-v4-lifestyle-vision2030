import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const N8N_CREATE_ORDER_API = "https://n8n.srv821341.hstgr.cloud/webhook/create-table-order";
const N8N_UPDATE_STATUS_API = "https://n8n.srv821341.hstgr.cloud/webhook/update-order-status";

// Fichier de persistance sur disque pour partager l'état entre tous les workers Node.js
const DB_FILE = path.join(process.cwd(), '.orders_db.json');

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

// Helpers lecture/écriture persistante
function getStoredOrders(): StoredOrder[] {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data) || [];
    }
  } catch (e) {
    console.error("Erreur lecture orders_db:", e);
  }
  return [];
}

function saveStoredOrders(orders: StoredOrder[]) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(orders.slice(0, 100), null, 2), 'utf-8');
  } catch (e) {
    console.error("Erreur écriture orders_db:", e);
  }
}

// GET /api/orders?instance=doha_pilot OU /api/orders?orderId=SR-123456
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const instance = searchParams.get('instance')?.toLowerCase();
  const orderId = searchParams.get('orderId');

  const orders = getStoredOrders();

  // Si on cherche le statut d'une commande précise
  if (orderId) {
    const order = orders.find(o => o.order_id.toLowerCase() === orderId.toLowerCase());
    if (order) {
      return NextResponse.json({ success: true, order });
    }
    return NextResponse.json({ success: true, order: { order_id: orderId, status: 'recue' } });
  }

  // Si on cherche les commandes d'une instance pour le KDS
  if (instance) {
    const filtered = orders.filter(o => 
      o.instance_name.toLowerCase().includes(instance) || instance.includes(o.instance_name.toLowerCase())
    );
    return NextResponse.json({ success: true, orders: filtered });
  }

  return NextResponse.json({ success: true, orders });
}

// POST /api/orders (Création d'une nouvelle commande par le client)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newOrder: StoredOrder = {
      order_id: body.order_id || `SR-${Math.floor(100000 + Math.random() * 900000)}`,
      instance_name: body.instance_name || 'doha_pilot',
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

    // Relais au webhook n8n
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

    // Relais à n8n
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
