'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ChefHat, Clock, CheckCircle2, AlertCircle, Volume2, VolumeX, 
  RefreshCw, Utensils, ArrowRight, ShieldCheck, Flame, Bell, 
  Smartphone, Filter, Search, Check, Play, Sparkles, Lock, Unlock,
  KeyRound, Delete, LogOut, TrendingUp, DollarSign, ShoppingCart, 
  Calendar, ChevronDown, BarChart3, CreditCard, Layers, QrCode, FileSpreadsheet, Download
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
  customer_email?: string;
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

export default function KitchenDisplaySystemPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  // Langue avec auto-détection et mémorisation
  const [lang, setLang] = useState<'fr' | 'ar' | 'en'>('en'); // Anglais par défaut pour les cuisines internationales de luxe (Doha)
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('kds_lang') || localStorage.getItem('user_lang');
      if (stored === 'en' || stored === 'ar' || stored === 'fr') {
        setLang(stored);
      } else {
        const userNavLang = (navigator.language || '').toLowerCase();
        if (userNavLang.startsWith('fr')) setLang('fr');
        else if (userNavLang.startsWith('ar')) setLang('ar');
        else setLang('en');
      }
    }
  }, []);
  
  // Authentification sécurisée
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  // Données commandes KDS
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [filterTable, setFilterTable] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'recue' | 'en_cuisine' | 'prete'>('all');
  const [nowTime, setNowTime] = useState(Date.now());

  const paramInst = typeof params?.instance === 'string' ? params.instance : (searchParams.get('instance') || '');
  const rawInstance = paramInst.trim().toLowerCase() || 'bos_cafe_moq';
  const restaurantName = rawInstance
    ? rawInstance.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : "Kitchen Display";

  // 1. Vérification de la session auth au chargement
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`/api/auth/kitchen?instance=${rawInstance}&t=${Date.now()}`);
        const data = await res.json();
        setIsAuthenticated(!!data.authenticated);
      } catch (e) {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, [rawInstance]);

  // Validation du Code PIN côté serveur
  const handlePinSubmit = async (pinValue?: string) => {
    const pin = pinValue || enteredPin;
    if (!pin || pin.length < 4 || isAuthenticating) return;
    
    setIsAuthenticating(true);
    setPinError('');

    try {
      const res = await fetch('/api/auth/kitchen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instance: rawInstance, pin })
      });
      const data = await res.json();

      if (data.success) {
        setIsAuthenticated(true);
        setEnteredPin('');
      } else {
        setPinError(data.message || (lang === 'ar' ? 'رمز الدخول غير صحيح' : 'Code PIN incorrect'));
        setEnteredPin('');
      }
    } catch (e) {
      setPinError(lang === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Erreur de connexion');
      setEnteredPin('');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Clavier physique (support touches 0-9, Backspace, Entrée)
  useEffect(() => {
    if (isAuthenticated) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        if (enteredPin.length < 6) {
          const next = enteredPin + e.key;
          setEnteredPin(next);
          if (next.length === 4) {
            handlePinSubmit(next);
          }
        }
      } else if (e.key === 'Backspace') {
        setEnteredPin(prev => prev.slice(0, -1));
        setPinError('');
      } else if (e.key === 'Enter') {
        handlePinSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enteredPin, isAuthenticated]);

  // Verrouillage du KDS
  const handleLock = async () => {
    try {
      await fetch(`/api/auth/kitchen?instance=${rawInstance}`, { method: 'DELETE' });
      setIsAuthenticated(false);
      setEnteredPin('');
    } catch (e) {}
  };

  // Bip sonore pour nouvelle commande (Web Audio API natif)
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
    } catch (e) {}
  };

  // Synchronisation Cloud en temps réel avec /api/orders (Polling 3s quand authentifié)
  useEffect(() => {
    if (!isAuthenticated) return;

    let lastOrderIds = new Set<string>();

    const fetchServerOrders = async () => {
      try {
        const res = await fetch(`/api/orders?instance=${rawInstance}&t=${Date.now()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.orders)) {
          const newOrders = data.orders as KitchenOrder[];
          if (lastOrderIds.size > 0 && newOrders.length > lastOrderIds.size) {
            const hasNew = newOrders.some(o => !lastOrderIds.has(o.order_id));
            if (hasNew) playChimeSound();
          }
          lastOrderIds = new Set(newOrders.map(o => o.order_id));
          setOrders(newOrders);
        }
      } catch (err) {}
    };

    fetchServerOrders();
    const interval = setInterval(fetchServerOrders, 3000);

    return () => clearInterval(interval);
  }, [rawInstance, soundEnabled, isAuthenticated]);

  // Horloge temps réel pour le chrono
  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Calcul du temps écoulé en minutes
  const getElapsedMinutes = (timestamp: string) => {
    if (!timestamp) return 0;
    const orderDate = new Date(timestamp).getTime();
    if (isNaN(orderDate)) return 0;
    const diffMs = nowTime - orderDate;
    return Math.max(0, Math.floor(diffMs / (1000 * 60)));
  };

  // Transition de statut commande
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setOrders(prev => prev.map(o => o.order_id === orderId ? { ...o, status: newStatus } : o));

    try {
      await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          status: newStatus,
          instance: rawInstance
        })
      });
    } catch (err) {
      console.error("Échec mise à jour statut serveur:", err);
    }
  };

  const [timePeriod, setTimePeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [selectedDate, setSelectedDate] = useState<string>(''); // YYYY-MM-DD
  const [showStatsWidget, setShowStatsWidget] = useState<boolean>(true);

  // Filtrage avancé par table, date et période
  const periodFilteredOrders = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();

    return orders.filter(o => {
      if (!o.timestamp) return true;
      const orderDate = new Date(o.timestamp);
      if (isNaN(orderDate.getTime())) return true;
      const orderDateStr = orderDate.toISOString().split('T')[0];

      // Filtre date spécifique si renseignée
      if (selectedDate && orderDateStr !== selectedDate) {
        return false;
      }

      // Filtre période si pas de date spécifique
      if (!selectedDate) {
        if (timePeriod === 'today') {
          return orderDateStr === todayStr;
        }
        if (timePeriod === 'week') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return orderDate >= sevenDaysAgo;
        }
        if (timePeriod === 'month') {
          return orderDate.getFullYear() === now.getFullYear() && orderDate.getMonth() === now.getMonth();
        }
      }

      return true;
    });
  }, [orders, timePeriod, selectedDate]);

  // Statistiques en direct basées sur les commandes filtrées par période
  const stats = useMemo(() => {
    const totalOrdersCount = periodFilteredOrders.length;
    const totalRevenue = periodFilteredOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const averageTicket = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;
    const paidOnlineCount = periodFilteredOrders.filter(o => o.payment_method === 'apple_pay' || o.payment_method === 'card').length;
    const paidCounterCount = periodFilteredOrders.filter(o => o.payment_method === 'counter').length;
    const currency = orders[0]?.currency || 'QAR';

    // Top tables
    const tableCounts: Record<string, { count: number; total: number }> = {};
    periodFilteredOrders.forEach(o => {
      const tbl = o.table_number || '01';
      if (!tableCounts[tbl]) tableCounts[tbl] = { count: 0, total: 0 };
      tableCounts[tbl].count += 1;
      tableCounts[tbl].total += (Number(o.total_amount) || 0);
    });

    return {
      totalOrdersCount,
      totalRevenue,
      averageTicket,
      paidOnlineCount,
      paidCounterCount,
      currency,
      tableCounts
    };
  }, [periodFilteredOrders, orders]);

  // Filtrage des commandes pour la vue KDS des tickets en cuisine
  const filteredOrders = useMemo(() => {
    return periodFilteredOrders.filter(o => {
      if (filterTable && !o.table_number.toLowerCase().includes(filterTable.toLowerCase())) {
        return false;
      }
      if (activeTab !== 'all' && o.status !== activeTab) {
        return false;
      }
      return o.status !== 'servie';
    });
  }, [periodFilteredOrders, filterTable, activeTab]);

  const countRecues = periodFilteredOrders.filter(o => o.status === 'recue').length;
  const countEnCuisine = periodFilteredOrders.filter(o => o.status === 'en_cuisine').length;
  const countPretes = periodFilteredOrders.filter(o => o.status === 'prete').length;

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
      soundOff: "Son coupé",
      lockScreenTitle: "Accès Écran Cuisine KDS",
      lockScreenSub: "Veuillez saisir le code PIN de l'établissement pour accéder aux commandes en direct.",
      enterPin: "Saisissez votre code PIN",
      clearPin: "Effacer",
      validatePin: "Déverrouiller",
      lockKds: "Verrouiller",
      defaultPinHint: "PIN configuré dans NocoDB",
      kpiRevenue: "Chiffre d'Affaires",
      kpiOrders: "Commandes Validées",
      kpiAverage: "Panier Moyen",
      kpiOnline: "Payé en ligne",
      kpiCounter: "À régler comptoir",
      periodToday: "Aujourd'hui",
      periodWeek: "7 Derniers Jours",
      periodMonth: "Ce Mois",
      periodAll: "Tout l'Historique",
      filterByDate: "Filtrer par date",
      hideStats: "Masquer stats",
      showStats: "Voir stats financières",
      exportBtn: "Exporter CSV / Excel",
      salesCount: "ventes",
      paymentSplitTitle: "Moyens de Paiement",
      paidOnlineBadge: "en ligne",
      paidCounterBadge: "comptoir",
      periodLabel: "Période",
      clearFilter: "Effacer"
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
      soundOff: "الصوت مكتوم",
      lockScreenTitle: "دخول شاشة المطبخ KDS",
      lockScreenSub: "يرجى إدخال الرمز السري للوصول إلى إدارة الطلبات الحية.",
      enterPin: "أدخل الرمز السري",
      clearPin: "مسح",
      validatePin: "دخول",
      lockKds: "قفل الشاشة",
      defaultPinHint: "الرمز محدد في لوحة التحكم NocoDB",
      kpiRevenue: "إجمالي المبيعات",
      kpiOrders: "عدد الطلبات",
      kpiAverage: "متوسط الفاتورة",
      kpiOnline: "دفع إلكتروني",
      kpiCounter: "دفع كاشير",
      periodToday: "اليوم",
      periodWeek: "آخر 7 أيام",
      periodMonth: "هذا الشهر",
      periodAll: "السجل بالكامل",
      filterByDate: "فلترة بالتاريخ",
      hideStats: "إخفاء الإحصائيات",
      showStats: "عرض المبيعات",
      exportBtn: "تصدير Excel / CSV",
      salesCount: "طلبات",
      paymentSplitTitle: "طرق الدفع",
      paidOnlineBadge: "إلكتروني",
      paidCounterBadge: "كاشير",
      periodLabel: "الفترة",
      clearFilter: "مسح"
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
      soundOff: "Muted",
      lockScreenTitle: "Kitchen KDS Access",
      lockScreenSub: "Enter establishment security PIN to view real-time live orders.",
      enterPin: "Enter Secret PIN",
      clearPin: "Clear",
      validatePin: "Unlock KDS",
      lockKds: "Lock",
      defaultPinHint: "PIN managed via NocoDB",
      kpiRevenue: "Total Revenue",
      kpiOrders: "Orders Placed",
      kpiAverage: "Average Ticket",
      kpiOnline: "Paid Online",
      kpiCounter: "Pay at Counter",
      periodToday: "Today",
      periodWeek: "Last 7 Days",
      periodMonth: "This Month",
      periodAll: "All Time",
      filterByDate: "Filter date",
      hideStats: "Hide stats",
      showStats: "Show live revenue",
      exportBtn: "Export CSV / Excel",
      salesCount: "sales",
      paymentSplitTitle: "Payment Methods",
      paidOnlineBadge: "online",
      paidCounterBadge: "counter",
      periodLabel: "Period",
      clearFilter: "Clear"
    }
  }[lang];

  // -------------------------------------------------------------
  // ÉCRAN DE VERROUILLAGE SÉCURISÉ (PIN KEYPAD LOCK SCREEN)
  // -------------------------------------------------------------
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#14100E] flex items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-[#C5A880] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return (
      <div 
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        className="min-h-screen bg-gradient-to-b from-[#1E1916] via-[#14100E] to-[#0D0A08] text-[#FAF8F5] flex flex-col justify-between p-4 md:p-8"
        style={{ fontFamily: "'Cairo', system-ui, -apple-system, sans-serif" }}
      >
        {/* Header avec sélecteur de langue */}
        <div className="flex justify-between items-center max-w-md mx-auto w-full">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#3D352E] flex items-center justify-center text-[#C5A880]">
              <Lock className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-[#A8988B] tracking-wider uppercase">
              Smart Review KDS Guard
            </span>
          </div>

          <div className="flex bg-[#2E2722] p-0.5 rounded-full border border-[#4A3D34]">
            {(['fr', 'ar', 'en'] as const).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2.5 py-1 text-xs font-bold rounded-full transition-all ${lang === l ? 'bg-[#C5A880] text-[#1E1916]' : 'text-[#A8988B] hover:text-white'}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Boîtier Clavier PIN Central */}
        <div className="max-w-sm mx-auto w-full bg-[#241E1A]/90 backdrop-blur-xl border border-[#3D352E] rounded-3xl p-6 md:p-8 shadow-2xl text-center my-auto">
          {/* Logo / Badge Chef */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#3D352E] to-[#5C4D41] mx-auto flex items-center justify-center mb-4 shadow-lg ring-4 ring-[#C5A880]/20">
            <ChefHat className="w-8 h-8 text-[#C5A880]" />
          </div>

          <h2 className="text-xl md:text-2xl font-black text-[#FAF8F5] mb-1">
            {restaurantName}
          </h2>
          <p className="text-xs text-[#A8988B] leading-relaxed mb-6">
            {t.lockScreenSub}
          </p>

          {/* Indicateurs de points PIN */}
          <div className="flex justify-center items-center gap-3 mb-6">
            {[0, 1, 2, 3].map(idx => (
              <div 
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-300 ${
                  enteredPin.length > idx 
                    ? 'bg-[#C5A880] scale-125 shadow-[0_0_12px_rgba(197,168,128,0.8)]' 
                    : 'bg-[#3D352E] border border-[#5C4D41]'
                }`}
              />
            ))}
          </div>

          {/* Message d'erreur */}
          {pinError && (
            <div className="mb-4 py-2 px-3 bg-red-950/60 border border-red-800 text-red-300 text-xs font-bold rounded-xl animate-shake flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          {/* Pavé Numérique Tactile (1 à 9, 0, Effacer, Valider) */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => {
                  if (enteredPin.length < 6) {
                    const next = enteredPin + num;
                    setEnteredPin(next);
                    setPinError('');
                    if (next.length === 4) handlePinSubmit(next);
                  }
                }}
                className="h-14 rounded-2xl bg-[#2E2722] hover:bg-[#3D352E] active:scale-95 text-xl font-bold text-[#FAF8F5] border border-[#3D352E] transition-all shadow-sm flex items-center justify-center hover:border-[#C5A880]/50"
              >
                {num}
              </button>
            ))}

            {/* Bouton Effacer */}
            <button
              onClick={() => { setEnteredPin(''); setPinError(''); }}
              className="h-14 rounded-2xl bg-[#2A231F] hover:bg-[#382E28] active:scale-95 text-xs font-bold text-[#A8988B] border border-[#3D352E] transition-all flex items-center justify-center"
            >
              {t.clearPin}
            </button>

            {/* Bouton 0 */}
            <button
              onClick={() => {
                if (enteredPin.length < 6) {
                  const next = enteredPin + '0';
                  setEnteredPin(next);
                  setPinError('');
                  if (next.length === 4) handlePinSubmit(next);
                }
              }}
              className="h-14 rounded-2xl bg-[#2E2722] hover:bg-[#3D352E] active:scale-95 text-xl font-bold text-[#FAF8F5] border border-[#3D352E] transition-all flex items-center justify-center hover:border-[#C5A880]/50"
            >
              0
            </button>

            {/* Bouton Backspace */}
            <button
              onClick={() => {
                setEnteredPin(prev => prev.slice(0, -1));
                setPinError('');
              }}
              className="h-14 rounded-2xl bg-[#2A231F] hover:bg-[#382E28] active:scale-95 text-[#A8988B] border border-[#3D352E] transition-all flex items-center justify-center"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Bouton Validation */}
          <button
            onClick={() => handlePinSubmit()}
            disabled={enteredPin.length < 4 || isAuthenticating}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#C5A880] to-[#DFCDBC] text-[#1E1916] font-black text-sm transition-all shadow-lg hover:brightness-105 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isAuthenticating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <KeyRound className="w-4 h-4" />
            )}
            <span>{t.validatePin}</span>
          </button>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-[#7A695B] max-w-xs mx-auto">
          <span>🔒 {t.defaultPinHint}</span>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ÉCRAN KDS PRINCIPAL (LORSQUE DÉVERROUILLÉ)
  // -------------------------------------------------------------
  return (
    <div 
      dir={lang === 'ar' ? 'rtl' : 'ltr'} 
      className="min-h-screen bg-[#1E1916] text-[#F5EFE6] font-sans antialiased p-3 md:p-6 select-none"
      style={{ fontFamily: "'Cairo', system-ui, -apple-system, sans-serif" }}
    >
      {/* HEADER KDS SUPÉRIEUR */}
      <header className="bg-[#2B231D] rounded-3xl p-4 border border-[#3D332A] shadow-xl mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Logo & Titre Restaurant */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#8C6D48] text-[#1E1916] flex items-center justify-center shadow-lg">
              <ChefHat className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-[#FAF8F5] tracking-wide">
                  {restaurantName}
                </h1>
                <span className="flex items-center gap-1 bg-red-950/80 text-red-300 border border-red-700/60 px-2 py-0.5 rounded-full text-[10px] font-black uppercase animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                  {t.live}
                </span>
              </div>
              <p className="text-xs text-[#A8988B]">
                {t.kdsTitle} • {orders.length} {t.order}(s) au total
              </p>
            </div>
          </div>

          {/* Contrôles : Recherche Table, Son, Langue, Verrouillage */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtre par numéro de table */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
              <input
                type="text"
                value={filterTable}
                onChange={(e) => setFilterTable(e.target.value)}
                placeholder={t.filterTablePlaceholder}
                className="w-32 md:w-40 py-2 pl-9 pr-3 rtl:pr-9 rtl:pl-3 bg-[#1A1411] border border-[#42362C] rounded-2xl text-xs text-[#FAF8F5] placeholder-[#7A695B] focus:outline-none focus:border-[#C5A880]"
              />
            </div>

            {/* Bouton Son */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? t.soundOn : t.soundOff}
              className={`p-2.5 rounded-2xl border transition-all ${
                soundEnabled 
                  ? 'bg-[#3D332A] text-[#C5A880] border-[#5A4B3E] hover:bg-[#4D4034]' 
                  : 'bg-[#1A1411] text-[#7A695B] border-[#332A22]'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Sélecteur de langue */}
            <div className="flex bg-[#1A1411] p-0.5 rounded-2xl border border-[#3A2F27]">
              {(['en', 'fr', 'ar'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => {
                    setLang(l);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('kds_lang', l);
                    }
                  }}
                  className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all ${
                    lang === l 
                      ? 'bg-[#C5A880] text-[#1E1916] shadow-sm font-black' 
                      : 'text-[#8C7A6B] hover:text-[#FAF8F5]'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Bouton Afficher / Masquer Stats Manager */}
            <button
              onClick={() => setShowStatsWidget(!showStatsWidget)}
              title={showStatsWidget ? t.hideStats : t.showStats}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs font-bold transition-all shadow-sm ${
                showStatsWidget 
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#B38F26] text-[#1E1916] border-[#D4AF37] font-black' 
                  : 'bg-[#1A1411] text-[#C5A880] border-[#42362C] hover:bg-[#2A221C]'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden md:inline">{showStatsWidget ? t.hideStats : t.showStats}</span>
            </button>

            {/* Bouton Chevalets QR Codes Tables */}
            <Link
              href={`/qr-generator/${rawInstance}`}
              title="Générateur de QR Codes & Chevalets"
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#1A1411] hover:bg-[#2A221C] text-[#FAF8F5] border border-[#42362C] text-xs font-bold transition-all shadow-sm"
            >
              <QrCode className="w-4 h-4 text-[#C5A880]" />
              <span className="hidden lg:inline">QR Tables</span>
            </Link>

            {/* Bouton Verrouiller / Déconnexion */}
            <button
              onClick={handleLock}
              title={t.lockKds}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#3D2622] hover:bg-[#522F2A] text-red-300 border border-red-900/60 text-xs font-bold transition-all shadow-sm"
            >
              <Lock className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">{t.lockKds}</span>
            </button>
          </div>
        </div>

        {/* WIDGET STATISTIQUES FINANCIÈRES & FILTRES EN TEMPS RÉEL (POUR LE MANAGER) */}
        {showStatsWidget && (
          <div className="mt-4 pt-4 border-t border-[#3D332A] space-y-3 animate-fade-in">
            
            {/* Barre de filtres de période */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-[#A8988B] flex items-center gap-1 mr-1">
                  <Calendar className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>{t.periodLabel} :</span>
                </span>
                {(['today', 'week', 'month', 'all'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => { setTimePeriod(p); setSelectedDate(''); }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      timePeriod === p && !selectedDate
                        ? 'bg-[#C5A880] text-[#1E1916] font-black shadow-sm'
                        : 'bg-[#1A1411] text-[#8C7A6B] hover:text-[#FAF8F5] border border-[#332A22]'
                    }`}
                  >
                    {p === 'today' ? t.periodToday : (p === 'week' ? t.periodWeek : (p === 'month' ? t.periodMonth : t.periodAll))}
                  </button>
                ))}
              </div>

              {/* Sélecteur de date précise */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#A8988B]">{t.filterByDate} :</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => { setSelectedDate(e.target.value); }}
                  className="bg-[#1A1411] border border-[#42362C] rounded-xl px-2.5 py-1 text-xs text-[#FAF8F5] focus:outline-none focus:border-[#C5A880]"
                />
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate('')}
                    className="text-[10px] text-amber-400 hover:underline"
                  >
                    {t.clearFilter}
                  </button>
                )}

                {/* Bouton Export Récapitulatif Comptable CSV / Excel */}
                <button
                  onClick={() => {
                    if (periodFilteredOrders.length === 0) {
                      alert(lang === 'ar' ? 'لا توجد طلبات في هذه الفترة لتصديرها' : (lang === 'en' ? 'No orders in this period to export.' : 'Aucune commande sur cette période à exporter.'));
                      return;
                    }

                    // En-têtes CSV
                    const headers = lang === 'en' 
                      ? ["Order ID", "Date & Time", "Table", "Status", "Payment Method", "Total (Currency)", "Items & Quantities", "Customer", "WhatsApp Phone", "Email"]
                      : ["ID Commande", "Date & Heure", "Table", "Statut", "Moyen de Paiement", "Total (Devise)", "Plats & Quantités", "Client", "Tel WhatsApp", "Email"];
                    
                    // Lignes CSV
                    const rows = periodFilteredOrders.map(o => {
                      const itemsSummary = o.items.map(it => `${it.quantity}x ${it.name}`).join(' | ');
                      const formattedDate = new Date(o.timestamp).toLocaleString(lang === 'en' ? 'en-US' : (lang === 'ar' ? 'ar-QA' : 'fr-FR'));
                      return [
                        `"${o.order_id}"`,
                        `"${formattedDate}"`,
                        `"Table ${o.table_number}"`,
                        `"${o.status}"`,
                        `"${o.payment_method === 'apple_pay' ? 'Apple Pay' : (o.payment_method === 'card' ? 'Card' : 'Cashier')}"`,
                        `"${o.total_amount.toFixed(2)} ${o.currency || 'QAR'}"`,
                        `"${itemsSummary.replace(/"/g, '""')}"`,
                        `"${(o.customer_name || 'Client').replace(/"/g, '""')}"`,
                        `"${o.customer_phone || ''}"`,
                        `"${o.customer_email || ''}"`
                      ].join(';');
                    });

                    const csvContent = "\uFEFF" + [headers.join(';'), ...rows].join('\r\n');
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.setAttribute('href', url);
                    link.setAttribute('download', `Sales_Report_${rawInstance}_${timePeriod || 'custom'}_${new Date().toISOString().slice(0,10)}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 bg-[#241E1A] hover:bg-[#382E27] text-emerald-400 border border-emerald-600/40 rounded-xl text-xs font-bold transition shadow-sm"
                  title="Exporter le récapitulatif détaillé en Excel / CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>{t.exportBtn}</span>
                </button>
              </div>
            </div>

            {/* 4 Cartes KPI Financières & Métier */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* KPI 1 : Chiffre d'Affaires */}
              <div className="bg-[#1A1411]/90 border border-[#3D332A] rounded-2xl p-3.5 flex items-center justify-between shadow-md">
                <div>
                  <p className="text-[11px] font-bold text-[#A8988B] uppercase tracking-wider">{t.kpiRevenue}</p>
                  <p className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FAF8F5] via-[#DFCDBC] to-[#C5A880] mt-0.5">
                    {stats.totalRevenue.toFixed(2)} <span className="text-xs font-normal text-[#A8988B]">{stats.currency}</span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-700/50 text-emerald-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              {/* KPI 2 : Nombre de Commandes */}
              <div className="bg-[#1A1411]/90 border border-[#3D332A] rounded-2xl p-3.5 flex items-center justify-between shadow-md">
                <div>
                  <p className="text-[11px] font-bold text-[#A8988B] uppercase tracking-wider">{t.kpiOrders}</p>
                  <p className="text-xl md:text-2xl font-black text-[#FAF8F5] mt-0.5">
                    {stats.totalOrdersCount} <span className="text-xs font-normal text-[#A8988B]">{t.salesCount}</span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-700/50 text-blue-400 flex items-center justify-center shrink-0">
                  <ShoppingCart className="w-5 h-5" />
                </div>
              </div>

              {/* KPI 3 : Panier Moyen */}
              <div className="bg-[#1A1411]/90 border border-[#3D332A] rounded-2xl p-3.5 flex items-center justify-between shadow-md">
                <div>
                  <p className="text-[11px] font-bold text-[#A8988B] uppercase tracking-wider">{t.kpiAverage}</p>
                  <p className="text-xl md:text-2xl font-black text-[#FAF8F5] mt-0.5">
                    {stats.averageTicket.toFixed(2)} <span className="text-xs font-normal text-[#A8988B]">{stats.currency}</span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-700/50 text-purple-400 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>

              {/* KPI 4 : Répartition Paiements */}
              <div className="bg-[#1A1411]/90 border border-[#3D332A] rounded-2xl p-3.5 flex items-center justify-between shadow-md">
                <div>
                  <p className="text-[11px] font-bold text-[#A8988B] uppercase tracking-wider">{t.paymentSplitTitle}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span className="text-emerald-400 font-black">💳 {stats.paidOnlineCount} {t.paidOnlineBadge}</span>
                    <span className="text-[#8C7A6B]">•</span>
                    <span className="text-amber-400 font-black">💵 {stats.paidCounterCount} {t.paidCounterBadge}</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-700/50 text-amber-400 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Onglets de Statut KDS */}
        <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-[#3D332A]">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'all' 
                ? 'bg-[#FAF8F5] text-[#1E1916] shadow-md font-black' 
                : 'bg-[#1A1411] text-[#A8988B] hover:bg-[#241C17] border border-[#332A22]'
            }`}
          >
            <span>{t.all}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#C5A880]/30 text-current text-[10px] font-black">
              {orders.filter(o => o.status !== 'servie').length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('recue')}
            className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'recue' 
                ? 'bg-amber-500 text-black shadow-md font-black' 
                : 'bg-[#1A1411] text-amber-400/80 hover:bg-[#241C17] border border-amber-900/40'
            }`}
          >
            <span>{t.recue}</span>
            {countRecues > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-200 text-[10px] font-black animate-bounce">
                {countRecues}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('en_cuisine')}
            className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'en_cuisine' 
                ? 'bg-blue-500 text-white shadow-md font-black' 
                : 'bg-[#1A1411] text-blue-400/80 hover:bg-[#241C17] border border-blue-900/40'
            }`}
          >
            <span>{t.en_cuisine}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-blue-950 text-blue-200 text-[10px] font-black">
              {countEnCuisine}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('prete')}
            className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'prete' 
                ? 'bg-emerald-500 text-white shadow-md font-black' 
                : 'bg-[#1A1411] text-emerald-400/80 hover:bg-[#241C17] border border-emerald-900/40'
            }`}
          >
            <span>{t.prete}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-200 text-[10px] font-black">
              {countPretes}
            </span>
          </button>
        </div>
      </header>

      {/* GRILLE DES COMMANDES EN CUISINE (TICKETS DE CUISINE) */}
      <main>
        {filteredOrders.length === 0 ? (
          <div className="text-center py-24 bg-[#261E19]/80 rounded-3xl border border-[#3D332A] p-8 max-w-lg mx-auto">
            <Utensils className="w-16 h-16 text-[#6B5A4E] mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-[#FAF8F5] mb-2">{t.emptyKitchen}</h3>
            <p className="text-xs text-[#A8988B] leading-relaxed">{t.emptyKitchenSub}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map((order) => {
              const elapsed = getElapsedMinutes(order.timestamp);
              const isUrgent = elapsed >= 15 && order.status !== 'prete';

              return (
                <div 
                  key={order.order_id}
                  className={`bg-[#2B231D] rounded-3xl border shadow-xl flex flex-col justify-between overflow-hidden transition-all ${
                    order.status === 'recue' 
                      ? 'border-amber-500/80 ring-2 ring-amber-500/30' 
                      : (order.status === 'en_cuisine' 
                          ? 'border-blue-500/80' 
                          : 'border-emerald-500/80')
                  } ${isUrgent ? 'animate-pulse' : ''}`}
                >
                  {/* Tête de Ticket */}
                  <div className={`p-4 border-b flex items-center justify-between ${
                    order.status === 'recue' 
                      ? 'bg-amber-950/40 border-amber-800/40' 
                      : (order.status === 'en_cuisine' 
                          ? 'bg-blue-950/40 border-blue-800/40' 
                          : 'bg-emerald-950/40 border-emerald-800/40')
                  }`}>
                    {/* Numéro de table */}
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-2xl bg-[#1E1916] text-[#FAF8F5] flex items-center justify-center font-black text-lg border border-[#4A3D34] shadow-inner">
                        {order.table_number}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-[#A8988B] font-bold">
                          {t.table}
                        </span>
                        <div className="text-xs font-mono text-[#D4C3B3] font-bold">
                          #{order.order_id.slice(-6)}
                        </div>
                      </div>
                    </div>

                    {/* Chronomètre écoulé */}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black ${
                      isUrgent 
                        ? 'bg-red-500 text-white animate-bounce' 
                        : 'bg-[#1E1916] text-[#C5A880] border border-[#4A3D34]'
                    }`}>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{elapsed} {t.elapsed}</span>
                    </div>
                  </div>

                  {/* Corps du Ticket : Liste des Plats & Instructions */}
                  <div className="p-4 space-y-3 flex-1 bg-[#241E1A]/60">
                    <div className="space-y-2.5">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="bg-[#1E1916]/80 p-3 rounded-2xl border border-[#3D332A]">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <span className="w-6 h-6 rounded-lg bg-[#C5A880] text-[#1E1916] font-black text-xs flex items-center justify-center shrink-0">
                                {item.quantity}x
                              </span>
                              <span className="font-bold text-sm text-[#FAF8F5] leading-snug">
                                {item.name}
                              </span>
                            </div>
                          </div>

                          {/* Options personnalisées */}
                          {item.options && item.options.length > 0 && (
                            <div className="mt-1.5 pl-8 rtl:pl-0 rtl:pr-8 flex flex-wrap gap-1">
                              {item.options.map((opt, oIdx) => (
                                <span key={oIdx} className="text-[10px] font-semibold bg-[#2E2722] text-[#D4C3B3] px-2 py-0.5 rounded-md border border-[#423830]">
                                  + {opt}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Note spéciale cuisine */}
                          {item.special_instructions && (
                            <div className="mt-2 text-[11px] bg-red-950/40 border border-red-900/60 text-red-200 p-1.5 rounded-lg flex items-start gap-1 font-semibold">
                              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                              <span>{item.special_instructions}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Mode de Paiement */}
                    <div className="pt-2 border-t border-[#3D332A] flex items-center justify-between text-[11px]">
                      <span className="text-[#A8988B] font-semibold">
                        {order.payment_method === 'apple_pay' && t.paidApple}
                        {order.payment_method === 'card' && t.paidCard}
                        {order.payment_method === 'counter' && (
                          <span className="text-amber-400 font-bold">{t.payAtCounter}</span>
                        )}
                      </span>
                      <span className="font-mono font-bold text-[#FAF8F5]">
                        {order.total_amount} {order.currency || 'QAR'}
                      </span>
                    </div>
                  </div>

                  {/* Boutons d'Action (Passer les étapes en 1 clic) */}
                  <div className="p-3 bg-[#1E1916] border-t border-[#3D332A] space-y-1.5">
                    {order.status === 'recue' && (
                      <button
                        onClick={() => handleUpdateStatus(order.order_id, 'en_cuisine')}
                        className="w-full py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md active:scale-98 flex items-center justify-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{t.startCooking}</span>
                      </button>
                    )}

                    {order.status === 'en_cuisine' && (
                      <button
                        onClick={() => handleUpdateStatus(order.order_id, 'prete')}
                        className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md active:scale-98 flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t.markReady}</span>
                      </button>
                    )}

                    {order.status === 'prete' && (
                      <button
                        onClick={() => handleUpdateStatus(order.order_id, 'servie')}
                        className="w-full py-2.5 rounded-2xl bg-[#3D352E] hover:bg-[#4D423A] text-[#FAF8F5] font-bold text-xs transition-all shadow-md active:scale-98 flex items-center justify-center gap-1.5 border border-[#5A4B3E]"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
                        <span>{t.markServed}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
