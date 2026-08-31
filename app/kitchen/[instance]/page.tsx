'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { 
  ChefHat, Clock, CheckCircle2, AlertCircle, Volume2, VolumeX, 
  RefreshCw, Utensils, ArrowRight, ShieldCheck, Flame, Bell, 
  Smartphone, Filter, Search, Check, Play, Sparkles
} from 'lucide-react';

export type OrderStatus = 'recue' | 'en_cuisine' | 'prete' | 'servie';

export interface KitchenOrderItem {
  id: string;
  name: string;
  quantity: number;
  options?: string[];
  special_instructions?: string;
  price?: number;
}

export interface KitchenOrder {
  order_id: string;
  instance_name: string;
  restaurant_name: string;
  table_number: string;
  customer_phone?: string;
  customer_name?: string;
  items: KitchenOrderItem[];
  subtotal: number;
  tip?: number;
  total_amount: number;
  currency: string;
  payment_method: string;
  status: OrderStatus;
  timestamp: string;
  elapsedMinutes?: number;
}

// Commandes de démonstration réalistes pour démarrage immédiat
const INITIAL_DEMO_ORDERS: KitchenOrder[] = [
  {
    order_id: "SR-849201",
    instance_name: "doha_pilot",
    restaurant_name: "Lusail Courtyard Café",
    table_number: "07",
    customer_name: "Ahmed K.",
    customer_phone: "+974 5512 3456",
    items: [
      {
        id: "sig-1",
        name: "ستيك تندرلوين واغيو بالزعفران / Wagyu Tenderloin",
        quantity: 2,
        options: ["درجة الاستواء: وسط مائل للاستواء (Med Rare)", "كمأة سوداء إضافية (+35 QAR)"],
        special_instructions: "الصلصة جانباً بدون فلفل حار"
      },
      {
        id: "bev-1",
        name: "سبانش لاتيه بارد مميز / Iced Spanish Latte",
        quantity: 2,
        options: ["حليب شوفان عضوي (+5 QAR)"]
      }
    ],
    subtotal: 444,
    tip: 20,
    total_amount: 464,
    currency: "QAR",
    payment_method: "apple_pay",
    status: "recue",
    timestamp: new Date(Date.now() - 3 * 60000).toISOString() // Il y a 3 min
  },
  {
    order_id: "SR-718294",
    instance_name: "doha_pilot",
    restaurant_name: "Lusail Courtyard Café",
    table_number: "03",
    customer_name: "Sarah M.",
    customer_phone: "+974 3388 9900",
    items: [
      {
        id: "sig-2",
        name: "ريزوتو الروبيان الملكي / Royal Prawn Risotto",
        quantity: 1,
        options: ["روبيان إضافي (2 حبة)"]
      },
      {
        id: "star-1",
        name: "سلطة البوراتا والشمندر / Burrata Salad",
        quantity: 1
      },
      {
        id: "bev-2",
        name: "موهيتو الباشن فروت / Passion Fruit Mocktail",
        quantity: 1
      }
    ],
    subtotal: 232,
    tip: 0,
    total_amount: 232,
    currency: "QAR",
    payment_method: "counter", // Règlement en caisse
    status: "en_cuisine",
    timestamp: new Date(Date.now() - 11 * 60000).toISOString() // Il y a 11 min
  },
  {
    order_id: "SR-629105",
    instance_name: "doha_pilot",
    restaurant_name: "Lusail Courtyard Café",
    table_number: "12",
    customer_name: "Fahad A.",
    items: [
      {
        id: "des-1",
        name: "كيكة التمر بالكراميل والآيس كريم / Saudi Date Cake",
        quantity: 2
      },
      {
        id: "bev-1",
        name: "سبانش لاتيه بارد مميز / Spanish Latte",
        quantity: 2
      }
    ],
    subtotal: 156,
    tip: 10,
    total_amount: 166,
    currency: "QAR",
    payment_method: "card",
    status: "prete",
    timestamp: new Date(Date.now() - 18 * 60000).toISOString() // Il y a 18 min
  }
];

export default function KitchenDisplaySystemPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const [lang, setLang] = useState<'fr' | 'ar' | 'en'>('fr');
  const [orders, setOrders] = useState<KitchenOrder[]>(INITIAL_DEMO_ORDERS);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [filterTable, setFilterTable] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'recue' | 'en_cuisine' | 'prete'>('all');
  const [nowTime, setNowTime] = useState(Date.now());

  const paramInst = typeof params?.instance === 'string' ? params.instance : (searchParams.get('instance') || '');
  const rawInstance = paramInst.trim().toLowerCase() || 'doha_pilot';
  const restaurantName = rawInstance
    ? rawInstance.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : "Kitchen Display";

  // Bip sonore pour nouvelle commande (Web Audio API natif, sans fichier externe)
  const playChimeSound = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.log("Audio non disponible", e);
    }
  };

  // Chargement et persistance des commandes (localStorage + BroadcastChannel)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sr_kitchen_orders_v5');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setOrders(parsed);
          }
        } catch (e) {}
      } else {
        localStorage.setItem('sr_kitchen_orders_v5', JSON.stringify(INITIAL_DEMO_ORDERS));
      }

      // Écouter les nouvelles commandes en temps réel émises par le checkout
      let channel: BroadcastChannel | null = null;
      try {
        channel = new BroadcastChannel('sr_order_sync');
        channel.onmessage = (event) => {
          if (event.data?.type === 'NEW_ORDER' && event.data?.order) {
            const newOrder: KitchenOrder = {
              ...event.data.order,
              status: 'recue',
              timestamp: event.data.order.timestamp || new Date().toISOString()
            };
            setOrders(prev => {
              const exists = prev.some(o => o.order_id === newOrder.order_id);
              if (exists) return prev;
              const updated = [newOrder, ...prev];
              localStorage.setItem('sr_kitchen_orders_v5', JSON.stringify(updated));
              return updated;
            });
            playChimeSound();
          }
        };
      } catch (e) {}

      // Écouter les changements dans le stockage local
      const handleStorage = (e: StorageEvent) => {
        if (e.key === 'sr_kitchen_orders_v5' && e.newValue) {
          try {
            setOrders(JSON.parse(e.newValue));
          } catch (err) {}
        }
      };
      window.addEventListener('storage', handleStorage);

      return () => {
        if (channel) channel.close();
        window.removeEventListener('storage', handleStorage);
      };
    }
  }, []);

  // Horloge temps réel pour le chrono de préparation
  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Calcul du temps écoulé en minutes
  const getElapsedMinutes = (timestamp: string) => {
    const diff = nowTime - new Date(timestamp).getTime();
    return Math.max(1, Math.floor(diff / 60000));
  };

  // Changement de statut d'une commande (1-clic) avec persistance et notification client
  const handleUpdateStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders(prev => {
      const updated = prev.map(order => {
        if (order.order_id === orderId) {
          return { ...order, status: newStatus };
        }
        return order;
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('sr_kitchen_orders_v5', JSON.stringify(updated));

        // Mettre à jour sr_last_order si c'est la même commande pour le client
        const lastOrderRaw = localStorage.getItem('sr_last_order');
        if (lastOrderRaw) {
          try {
            const lastOrder = JSON.parse(lastOrderRaw);
            if (lastOrder.order_id === orderId) {
              lastOrder.status = newStatus;
              localStorage.setItem('sr_last_order', JSON.stringify(lastOrder));
            }
          } catch (e) {}
        }

        // Émettre le signal temps réel à tous les onglets/clients
        try {
          const channel = new BroadcastChannel('sr_order_sync');
          channel.postMessage({ type: 'STATUS_UPDATE', orderId, status: newStatus });
          channel.close();
        } catch (e) {}
      }

      return updated;
    });

    // Envoi asynchrone à n8n pour mise à jour NocoDB en arrière-plan
    fetch('https://n8n.srv821341.hstgr.cloud/webhook/update-order-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, status: newStatus })
    }).catch(() => {});

    // Si la commande passe à "Prête", émettre un son d'alerte
    if (newStatus === 'prete') {
      playChimeSound();
    }
  };

  // Filtrage des commandes
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (filterTable && !o.table_number.toLowerCase().includes(filterTable.toLowerCase())) {
        return false;
      }
      if (activeTab !== 'all' && o.status !== activeTab) {
        return false;
      }
      return o.status !== 'servie'; // Masquer les terminées de la vue active
    });
  }, [orders, filterTable, activeTab]);

  // Décompte par statut
  const countRecues = orders.filter(o => o.status === 'recue').length;
  const countEnCuisine = orders.filter(o => o.status === 'en_cuisine').length;
  const countPretes = orders.filter(o => o.status === 'prete').length;

  const t = {
    fr: {
      kdsTitle: "Écran Cuisine KDS",
      live: "En Direct",
      all: "Toutes les commandes",
      recue: "Nouvelles",
      en_cuisine: "En Cuisine",
      prete: "Prêtes à Servir",
      servie: "Servie / Clôturée",
      table: "TABLE",
      order: "Commande",
      elapsed: "min",
      notes: "Instructions Cuisine :",
      startCooking: "👨‍🍳 Lancer en Cuisine",
      markReady: "🛎️ Marquer Prête",
      markServed: "✨ Marquer Servie",
      paidApple: "Payé en ligne (Apple Pay)",
      paidCard: "Payé par Carte (NAPS)",
      payAtCounter: "⚠️ À ENCAISSER EN CAISSE",
      emptyKitchen: "Aucune commande en cours pour le moment",
      emptyKitchenSub: "Les nouvelles commandes des tables apparaîtront ici automatiquement",
      filterTablePlaceholder: "Filtrer par table...",
      soundOn: "Son activé",
      soundOff: "Son coupé"
    },
    ar: {
      kdsTitle: "شاشة المطبخ KDS",
      live: "مباشر",
      all: "جميع الطلبات",
      recue: "طلبات جديدة",
      en_cuisine: "قيد التحضير",
      prete: "جاهزة للتقديم",
      servie: "تم التقديم",
      table: "طاولة",
      order: "طلب",
      elapsed: "دقيقة",
      notes: "ملاحظات المطبخ :",
      startCooking: "👨‍🍳 بدء التحضير",
      markReady: "🛎️ جاهز للتقديم",
      markServed: "✨ تم التقديم للطاولة",
      paidApple: "مدفوع إلكترونياً (Apple Pay)",
      paidCard: "مدفوع بالبطاقة (نابس)",
      payAtCounter: "⚠️ الدفع عند الكاشير",
      emptyKitchen: "لا توجد طلبات جارية حالياً",
      emptyKitchenSub: "ستظهر طلبات الطاولات الجديدة هنا تلقائياً مع تنبيه صوتي",
      filterTablePlaceholder: "بحث برقم الطاولة...",
      soundOn: "الصوت مفعل",
      soundOff: "الصوت مكتوم"
    },
    en: {
      kdsTitle: "Kitchen Display KDS",
      live: "Live Mode",
      all: "All Orders",
      recue: "New Orders",
      en_cuisine: "In Kitchen",
      prete: "Ready to Serve",
      servie: "Served",
      table: "TABLE",
      order: "Order",
      elapsed: "min",
      notes: "Kitchen Notes:",
      startCooking: "👨‍🍳 Start Cooking",
      markReady: "🛎️ Mark as Ready",
      markServed: "✨ Mark Served",
      paidApple: "Paid Online (Apple Pay)",
      paidCard: "Paid by Card (NAPS)",
      payAtCounter: "⚠️ PAY AT CASHIER",
      emptyKitchen: "No active orders right now",
      emptyKitchenSub: "New table orders will pop up here with instant audio chime",
      filterTablePlaceholder: "Filter table #...",
      soundOn: "Sound On",
      soundOff: "Muted"
    }
  }[lang];

  return (
    <div 
      dir={lang === 'ar' ? 'rtl' : 'ltr'} 
      className="min-h-screen bg-[#1E1916] text-[#F5EFE6] font-sans antialiased p-3 md:p-6 select-none"
      style={{ fontFamily: "'Cairo', system-ui, -apple-system, sans-serif" }}
    >
      {/* HEADER KDS SUPÉRIEUR */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#3D352E]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#C5A880] to-[#8C6D48] text-[#241E1A] flex items-center justify-center font-black text-xl shadow-lg">
            <ChefHat className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-[#FAF8F5]">
                {restaurantName}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                {t.live}
              </span>
            </div>
            <p className="text-xs text-[#A8988B]">{t.kdsTitle} • {orders.length} commandes enregistrées</p>
          </div>
        </div>

        {/* Contrôles Header (Son, Filtres, Langue) */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Champ recherche table */}
          <div className="relative">
            <input 
              type="text"
              value={filterTable}
              onChange={(e) => setFilterTable(e.target.value)}
              placeholder={t.filterTablePlaceholder}
              className="px-3 py-1.5 rounded-xl bg-[#2A231E] border border-[#4A3D34] text-xs text-[#FAF8F5] focus:outline-none focus:border-[#C5A880] w-32 md:w-40"
            />
          </div>

          {/* Bouton Son */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playChimeSound();
            }}
            className={`p-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
              soundEnabled 
                ? 'bg-[#3D352E] text-[#C5A880] border-[#C5A880]/40' 
                : 'bg-[#2A231E] text-gray-500 border-[#3D352E]'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Langue */}
          <div className="flex bg-[#2A231E] p-0.5 rounded-xl border border-[#4A3D34]">
            {(['fr', 'ar', 'en'] as const).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  lang === l ? 'bg-[#C5A880] text-[#241E1A]' : 'text-[#A8988B] hover:text-white'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* BARRE D'ONGLETS / STATUTS RAPIDES */}
      <div className="flex gap-2 overflow-x-auto py-4 scrollbar-none">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
            activeTab === 'all' 
              ? 'bg-[#C5A880] text-[#241E1A] shadow-md' 
              : 'bg-[#2A231E] text-[#A8988B] hover:bg-[#3D352E]'
          }`}
        >
          <span>{t.all}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20">{filteredOrders.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('recue')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
            activeTab === 'recue' 
              ? 'bg-amber-500 text-black shadow-md' 
              : 'bg-[#2A231E] text-amber-400/80 hover:bg-[#3D352E]'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span>{t.recue}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20">{countRecues}</span>
        </button>

        <button
          onClick={() => setActiveTab('en_cuisine')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
            activeTab === 'en_cuisine' 
              ? 'bg-blue-500 text-white shadow-md' 
              : 'bg-[#2A231E] text-blue-400/80 hover:bg-[#3D352E]'
          }`}
        >
          <ChefHat className="w-3.5 h-3.5" />
          <span>{t.en_cuisine}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20">{countEnCuisine}</span>
        </button>

        <button
          onClick={() => setActiveTab('prete')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
            activeTab === 'prete' 
              ? 'bg-emerald-500 text-black shadow-md' 
              : 'bg-[#2A231E] text-emerald-400/80 hover:bg-[#3D352E]'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>{t.prete}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20">{countPretes}</span>
        </button>
      </div>

      {/* GRILLE DES BONS DE COMMANDE (TICKETS CUISINE) */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-24 bg-[#2A231E]/60 rounded-3xl border border-[#3D352E] p-8 mt-4">
          <Utensils className="w-16 h-16 text-[#8C6D48] mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-[#FAF8F5] mb-1">{t.emptyKitchen}</h3>
          <p className="text-sm text-[#A8988B]">{t.emptyKitchenSub}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-2">
          {filteredOrders.map((order) => {
            const elapsed = getElapsedMinutes(order.timestamp);
            const isLate = elapsed >= 15;

            // Couleurs de badge par statut
            let statusColor = "bg-amber-500/20 text-amber-400 border-amber-500/30";
            let statusLabel = t.recue;
            if (order.status === 'en_cuisine') {
              statusColor = "bg-blue-500/20 text-blue-400 border-blue-500/30";
              statusLabel = t.en_cuisine;
            } else if (order.status === 'prete') {
              statusColor = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
              statusLabel = t.prete;
            }

            return (
              <div 
                key={order.order_id}
                className={`bg-[#2A231E] rounded-3xl p-4 border flex flex-col justify-between shadow-xl transition-all ${
                  isLate ? 'border-red-500/60 ring-2 ring-red-500/30' : 'border-[#3D352E]'
                } ${order.status === 'prete' ? 'border-emerald-500/60' : ''}`}
              >
                {/* Header Ticket (Table, ID, Chrono) */}
                <div>
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#3D352E]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-[#C5A880] tracking-tight">
                          {t.table} {order.table_number}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <div className="text-xs text-[#A8988B] mt-0.5">
                        #{order.order_id} • {order.customer_name || "Guest"}
                      </div>
                    </div>

                    {/* Chronomètre écoulé */}
                    <div className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 ${
                      isLate ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-[#1E1916] text-[#A8988B]'
                    }`}>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{elapsed} {t.elapsed}</span>
                    </div>
                  </div>

                  {/* Statut Paiement (Apple Pay vs Règlement Caisse) */}
                  <div className="mt-2.5">
                    {order.payment_method === 'counter' ? (
                      <div className="px-3 py-1.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-[11px] font-black flex items-center justify-between">
                        <span>{t.payAtCounter}</span>
                        <span>{order.total_amount} {order.currency}</span>
                      </div>
                    ) : (
                      <div className="px-3 py-1 rounded-xl bg-[#1E1916] border border-[#3D352E] text-emerald-400 text-[10px] font-bold flex items-center justify-between">
                        <span>{order.payment_method === 'apple_pay' ? t.paidApple : t.paidCard}</span>
                        <span>{order.total_amount} {order.currency}</span>
                      </div>
                    )}
                  </div>

                  {/* Liste des plats à préparer */}
                  <div className="py-3 space-y-2.5 divide-y divide-[#3D352E]/60 text-xs">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="pt-2 first:pt-0">
                        <div className="flex items-start gap-2">
                          <span className="w-6 h-6 rounded-lg bg-[#C5A880] text-[#1E1916] flex items-center justify-center font-black text-xs shrink-0">
                            {it.quantity}x
                          </span>
                          <div className="flex-1">
                            <span className="font-bold text-sm text-[#FAF8F5] leading-snug">
                              {it.name}
                            </span>

                            {/* Options de cuisson / suppléments */}
                            {it.options && it.options.length > 0 && (
                              <div className="text-[11px] text-[#A8988B] mt-0.5 space-y-0.5">
                                {it.options.map((opt, oIdx) => (
                                  <div key={oIdx} className="text-[#DFCDBF]">↳ {opt}</div>
                                ))}
                              </div>
                            )}

                            {/* Consignes spéciales de cuisine */}
                            {it.special_instructions && (
                              <div className="mt-1 p-1.5 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-300 text-[11px] font-semibold">
                                ⚠️ {it.special_instructions}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* BOUTONS D'ACTIONS TACTILES (Progression du Statut) */}
                <div className="pt-3 border-t border-[#3D352E] space-y-2">
                  {order.status === 'recue' && (
                    <button
                      onClick={() => handleUpdateStatus(order.order_id, 'en_cuisine')}
                      className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-lg transition-transform active:scale-98 flex items-center justify-center gap-2"
                    >
                      <span>{t.startCooking}</span>
                    </button>
                  )}

                  {order.status === 'en_cuisine' && (
                    <button
                      onClick={() => handleUpdateStatus(order.order_id, 'prete')}
                      className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg transition-transform active:scale-98 flex items-center justify-center gap-2"
                    >
                      <span>{t.markReady}</span>
                    </button>
                  )}

                  {order.status === 'prete' && (
                    <button
                      onClick={() => handleUpdateStatus(order.order_id, 'servie')}
                      className="w-full py-3 rounded-2xl bg-[#3D352E] hover:bg-[#4A3D34] text-[#FAF8F5] font-black text-xs border border-[#C5A880]/50 shadow-md transition-transform active:scale-98 flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4 text-[#C5A880]" />
                      <span>{t.markServed}</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
