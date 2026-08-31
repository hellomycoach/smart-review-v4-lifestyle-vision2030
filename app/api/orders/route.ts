import { NextResponse } from 'next/server';

const N8N_CREATE_ORDER_API = "https://n8n.srv821341.hstgr.cloud/webhook/create-table-order";
const N8N_UPDATE_STATUS_API = "https://n8n.srv821341.hstgr.cloud/webhook/update-order-status";

// Magasin global en mémoire sur le serveur Node.js (persiste pendant que le serveur tourne)
// Partagé en direct entre tous les smartphones et toutes les tablettes !
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

declare global {
  var __SR_ORDERS_STORE__: StoredOrder[] | undefined;
}

if (!global.__SR_ORDERS_STORE__) {
  global.__SR_ORDERS_STORE__ = [];
}

const ordersStore = global.__SR_ORDERS_STORE__;

// GET /api/orders?instance=doha_pilot OU /api/orders?orderId=SR-123456
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const instance = searchParams.get('instance')?.toLowerCase();
  const orderId = searchParams.get('orderId');

  // Si on cherche le statut d'une commande précise (pour la page de succès client)
  if (orderId) {
    const order = ordersStore.find(o => o.order_id === orderId);
    if (order) {
      return NextResponse.json({ success: true, order });
    }
    return NextResponse.json({ success: true, order: { order_id: orderId, status: 'recue' } });
  }

  // Si on cherche toutes les commandes pour l'écran cuisine KDS
  if (instance) {
    const filtered = ordersStore
      .filter(o => o.instance_name.toLowerCase().includes(instance) || instance.includes(o.instance_name.toLowerCase()))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return NextResponse.json({ success: true, orders: filtered });
  }

  return NextResponse.json({ success: true, orders: ordersStore });
}

// POST /api/orders (Création d'une nouvelle commande par le client)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newOrder: StoredOrder = {
      order_id: body.order_id || `SR-${Math.floor(100000 + Math.random() * 900000)}`,
      instance_name: body.instance_name || 'doha_pilot',
      restaurant_name: body.restaurant_name || 'Lusail Courtyard Café',
      table_number: body.table_number || '01',
      customer_phone: body.customer_phone || '',
      customer_email: body.customer_email || '',
      customer_name: body.customer_name || 'Guest',
      items: body.items || [],
      subtotal: body.subtotal || 0,
      tip: body.tip || 0,
      total_amount: body.total_amount || 0,
      currency: body.currency || 'QAR',
      payment_method: body.payment_method || 'counter',
      status: 'recue',
      timestamp: body.timestamp || new Date().toISOString()
    };

    // Insérer en tête du tableau
    const existingIdx = ordersStore.findIndex(o => o.order_id === newOrder.order_id);
    if (existingIdx >= 0) {
      ordersStore[existingIdx] = newOrder;
    } else {
      ordersStore.unshift(newOrder);
    }

    // Transmettre au webhook n8n pour NocoDB & WhatsApp
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

    const order = ordersStore.find(o => o.order_id === order_id);
    if (order) {
      order.status = status;
    } else {
      // Si la commande n'était pas en mémoire, la créer avec ce statut
      ordersStore.unshift({
        order_id,
        instance_name: body.instance_name || 'doha_pilot',
        restaurant_name: body.restaurant_name || '',
        table_number: body.table_number || '',
        items: [],
        subtotal: 0,
        total_amount: 0,
        currency: 'QAR',
        payment_method: 'counter',
        status: status,
        timestamp: new Date().toISOString()
      });
    }

    // Informer n8n de la mise à jour
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
