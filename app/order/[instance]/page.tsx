'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { 
  Sparkles, Flame, Coffee, Cake, Utensils, UtensilsCrossed, 
  Search, ShoppingBag, Plus, Minus, X, Check, Globe, 
  Clock, Flame as CalorieIcon, ChevronRight, ChevronLeft,
  CreditCard, Smartphone, CheckCircle2, AlertCircle, ArrowRight,
  ShieldCheck, Info, Heart, Mail
} from 'lucide-react';
import { 
  DEFAULT_CATEGORIES, 
  DEFAULT_MENU_ITEMS, 
  MenuItem, 
  MenuCategory,
  MenuItemOption
} from './mockData';

const N8N_RESTAURANTS_API = "https://n8n.srv821341.hstgr.cloud/webhook/get-restaurants";
const N8N_CREATE_ORDER_API = "https://n8n.srv821341.hstgr.cloud/webhook/create-table-order";

// Types pour le panier
export interface CartItemOption {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  price: number;
}

export interface CartItem {
  id: string; // unique cart line id
  menuItem: MenuItem;
  quantity: number;
  selectedOptions: CartItemOption[];
  specialInstructions: string;
  itemTotal: number;
}

export default function TableOrderingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Langue
  const [lang, setLang] = useState<'ar' | 'fr' | 'en'>('ar');
  const isRTL = lang === 'ar';

  // Paramètre instance & restaurant
  const paramInst = typeof params?.instance === 'string' ? params.instance : (searchParams.get('instance') || '');
  let rawInstance = paramInst.trim().toLowerCase();
  if (typeof window !== 'undefined' && !rawInstance) {
    const parts = window.location.pathname.split('/order/');
    if (parts.length > 1) {
      rawInstance = parts[1].split('/')[0].split('?')[0].trim().toLowerCase();
    }
  }

  const formattedUrlName = rawInstance
    ? rawInstance.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : "Lounge & Restaurant";

  // Table
  const urlTable = searchParams.get('table') || searchParams.get('t') || '';
  const [tableNumber, setTableNumber] = useState<string>(urlTable || '01');
  const [showTableModal, setShowTableModal] = useState(false);
  const [tempTableInput, setTempTableInput] = useState(tableNumber);

  // Restaurant data (Par défaut configuré pour le Qatar 🇶🇦 : Doha, QAR, TVA 0%)
  const [restaurant, setRestaurant] = useState<any>({
    name: formattedUrlName,
    city: "Doha",
    country: "Qatar",
    currency: "QAR",
    taxRate: 0.0, // 0% TVA au Qatar
    totalTables: 20, // Nombre total de tables par défaut
    coverImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    isOpen: true
  });

  // Menu data
  const [categories] = useState<MenuCategory[]>(DEFAULT_CATEGORIES);
  const [menuItems] = useState<MenuItem[]>(DEFAULT_MENU_ITEMS);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal Plat / Personnalisation
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, MenuItemOption>>({});
  const [specialNotes, setSpecialNotes] = useState("");

  // Panier
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [selectedTip, setSelectedTip] = useState<number>(0.05); // 5% par défaut
  const [paymentMethod, setPaymentMethod] = useState<'apple_pay' | 'card' | 'counter'>('apple_pay');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Auto-détection de langue
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userLang = (navigator.language || 'ar').toLowerCase();
      if (userLang.startsWith('fr')) setLang('fr');
      else if (userLang.startsWith('en')) setLang('en');
      else setLang('ar');

      const savedPhone = localStorage.getItem('user_phone') || '';
      if (savedPhone) setCustomerPhone(savedPhone);

      const savedEmail = localStorage.getItem('user_email') || '';
      if (savedEmail) setCustomerEmail(savedEmail);

      const savedTable = sessionStorage.getItem('sr_table_num');
      if (savedTable && !urlTable) setTableNumber(savedTable);
      else if (urlTable) {
        setTableNumber(urlTable);
        sessionStorage.setItem('sr_table_num', urlTable);
      }
    }
  }, [urlTable]);

  // Chargement métadonnées restaurant N8N si dispo (y compris total_tables NocoDB)
  useEffect(() => {
    const fetchRestInfo = async () => {
      if (!rawInstance) return;
      try {
        const res = await fetch(`${N8N_RESTAURANTS_API}?t=${Date.now()}`);
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.list || data.data || []);
        const cleanKey = rawInstance.replace(/[^a-z0-9]/g, "");
        const matched = list.find((r: any) => {
          const name = String(r.instance_name || r.restaurant_name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          return name.includes(cleanKey) || cleanKey.includes(name);
        });

        if (matched) {
          const isQatar = matched.country === "Qatar" || matched.city?.toLowerCase().includes("doha");
          const isFrance = matched.country === "France";
          const rawTotalTables = parseInt(matched.total_tables || matched.total_table || matched.tables_count || "20", 10);
          const parsedTotalTables = isNaN(rawTotalTables) || rawTotalTables <= 0 ? 20 : rawTotalTables;

          setRestaurant((prev: any) => ({
            ...prev,
            name: matched.restaurant_name || prev.name,
            city: matched.city || (isQatar ? "Doha" : prev.city),
            country: matched.country || (isQatar ? "Qatar" : "Qatar"),
            currency: isQatar ? "QAR" : (isFrance ? "EUR" : "SAR"),
            taxRate: isQatar ? 0.0 : (isFrance ? 0.10 : 0.15),
            totalTables: parsedTotalTables,
            coverImage: matched.cover_image || prev.coverImage
          }));
        }
      } catch (e) {
        // Fallback silencieux
      }
    };
    fetchRestInfo();
  }, [rawInstance]);

  const isQatarLocation = restaurant.currency === "QAR" || restaurant.country === "Qatar";

  // Dictionnaire de traductions
  const t = {
    ar: {
      table: "طاولة",
      changeTable: "تغيير الطاولة",
      enterTable: "أدخل رقم الطاولة",
      confirm: "تأكيد",
      cancel: "إلغاء",
      searchPlaceholder: "ابحث عن طبق، مشروب أو حلوى...",
      chefPick: "اختيار الشيف",
      popular: "الأكثر طلباً",
      spicy: "حار",
      veg: "نباتي",
      glutenFree: "خالي من الجلوتين",
      calories: "سعرة",
      addToCart: "إضافة للطلب",
      viewCart: "عرض الطلب",
      cartTitle: "تفاصيل طلب الطاولة",
      emptyCart: "سلة الطلبات فارغة حالياً",
      emptyCartSub: "تصفح قائمتنا واختر أشهى الأطباق المحضرة بعناية",
      specialNotes: "ملاحظات إضافية للمطبخ (اختياري)",
      specialNotesPlaceholder: "مثال: بدون بصل، الصلصة جانباً...",
      subtotal: "المجموع الفرعي",
      vat: isQatarLocation ? "ضريبة القيمة المضافة (0% - قطر)" : "ضريبة القيمة المضافة (15% مشمولة)",
      tip: "إكرامية الخدمة",
      total: "المجموع الكلي",
      orderNow: "تأكيد الطلب والدفع",
      orderProcessing: "جاري تأكيد طلبك...",
      paymentMethod: "طريقة الدفع",
      applePay: "Apple Pay (دفع فوري)",
      cardPay: isQatarLocation ? "نابس (NAPS) / بطاقة بنكية" : "مدى (Mada) / بطاقة بنكية",
      counterPay: "الدفع عند الكاشير",
      phone: "رقم الجوال (لإرسال الفاتورة ونقاط الولاء)",
      email: "البريد الإلكتروني (لاستلام الفاتورة الإلكترونية والرصيد)",
      emailPlaceholder: "name@example.com",
      guestName: "اسم العميل (اختياري)",
      tipCustom: "مخصص",
      currency: restaurant.currency === "QAR" ? "ر.ق" : (restaurant.currency === "SAR" ? "ر.س" : "€"),
      optionsRequired: "يرجى تحديد الخيارات الإلزامية",
      openHours: "مفتوح لاستقبال الطلبات",
      poweredBy: "تجربة ضيافة ذكية برعاية Smart Review AI"
    },
    fr: {
      table: "Table",
      changeTable: "Changer de table",
      enterTable: "Indiquez votre numéro de table",
      confirm: "Confirmer",
      cancel: "Annuler",
      searchPlaceholder: "Rechercher un plat, boisson, dessert...",
      chefPick: "Coup de Cœur Chef",
      popular: "Très Demandé",
      spicy: "Épicé",
      veg: "Végétarien",
      glutenFree: "Sans Gluten",
      calories: "kcal",
      addToCart: "Ajouter à la commande",
      viewCart: "Voir la commande",
      cartTitle: "Commande de la Table",
      emptyCart: "Votre panier est vide",
      emptyCartSub: "Sélectionnez vos plats préférés préparés à la minute",
      specialNotes: "Instructions particulières pour la cuisine",
      specialNotesPlaceholder: "Ex: cuisson d'appoint, sauce à part, sans oignon...",
      subtotal: "Sous-total",
      vat: isQatarLocation ? "TVA (0% - Qatar)" : "TVA (15% incluse)",
      tip: "Pourboire équipe",
      total: "Total à régler",
      orderNow: "Commander & Régler",
      orderProcessing: "Validation de votre commande...",
      paymentMethod: "Moyen de règlement",
      applePay: "Apple Pay (1-Clic)",
      cardPay: isQatarLocation ? "Carte Bancaire / NAPS Qatar" : "Carte Bancaire / Mada",
      counterPay: "Règlement en caisse",
      phone: "N° de téléphone (reçu SMS & fidélité)",
      email: "Email (pour recevoir votre facture & reçu digital)",
      emailPlaceholder: "nom@exemple.com",
      guestName: "Votre prénom (optionnel)",
      tipCustom: "Autre",
      currency: restaurant.currency === "QAR" ? "QAR" : (restaurant.currency === "SAR" ? "SAR" : "€"),
      optionsRequired: "Veuillez renseigner les choix obligatoires",
      openHours: "Service ouvert en continu",
      poweredBy: "Expérience culinaire propulsée par Smart Review AI"
    },
    en: {
      table: "Table",
      changeTable: "Change Table",
      enterTable: "Enter Table Number",
      confirm: "Confirm",
      cancel: "Cancel",
      searchPlaceholder: "Search dishes, drinks, desserts...",
      chefPick: "Chef's Signature",
      popular: "Popular Pick",
      spicy: "Spicy",
      veg: "Vegetarian",
      glutenFree: "Gluten Free",
      calories: "kcal",
      addToCart: "Add to Order",
      viewCart: "View Order",
      cartTitle: "Table Order Summary",
      emptyCart: "Your order is empty",
      emptyCartSub: "Browse our menu and pick our freshly crafted delights",
      specialNotes: "Kitchen notes or dietary preferences",
      specialNotesPlaceholder: "E.g., dressing on the side, well done...",
      subtotal: "Subtotal",
      vat: isQatarLocation ? "VAT (0% - Qatar)" : "VAT (15% incl.)",
      tip: "Staff Tip",
      total: "Total Amount",
      orderNow: "Place Order & Pay",
      orderProcessing: "Confirming your order...",
      paymentMethod: "Payment Method",
      applePay: "Apple Pay (Instant)",
      cardPay: isQatarLocation ? "Debit / Credit Card (NAPS)" : "Debit / Credit Card (Mada)",
      counterPay: "Pay at Cashier",
      phone: "Phone Number (for digital receipt & points)",
      email: "Email (for e-invoice & digital receipt)",
      emailPlaceholder: "name@example.com",
      guestName: "Guest Name (optional)",
      tipCustom: "Custom",
      currency: restaurant.currency === "QAR" ? "QAR" : (restaurant.currency === "SAR" ? "SAR" : "€"),
      optionsRequired: "Please select all required options",
      openHours: "Kitchen is open & ready",
      poweredBy: "Smart Hospitality powered by Smart Review AI"
    }
  }[lang];

  // Calcul du prix unitaire de l'article avec options sélectionnées dans la modale
  const currentModalItemPrice = useMemo(() => {
    if (!activeItem) return 0;
    let total = activeItem.price;
    Object.values(selectedOptions).forEach(opt => {
      total += opt.price;
    });
    return total;
  }, [activeItem, selectedOptions]);

  // Ouverture de la modale de personnalisation
  const handleOpenItem = (item: MenuItem) => {
    setActiveItem(item);
    setItemQuantity(1);
    setSpecialNotes("");
    
    // Initialiser les options obligatoires par défaut avec le premier choix
    const initialOpts: Record<string, MenuItemOption> = {};
    if (item.optionGroups) {
      item.optionGroups.forEach(grp => {
        if (grp.required && grp.options.length > 0) {
          initialOpts[grp.id] = grp.options[0];
        }
      });
    }
    setSelectedOptions(initialOpts);
  };

  // Ajout au panier
  const handleAddToCart = () => {
    if (!activeItem) return;

    // Vérifier les options obligatoires
    if (activeItem.optionGroups) {
      for (const grp of activeItem.optionGroups) {
        if (grp.required && !selectedOptions[grp.id]) {
          alert(t.optionsRequired);
          return;
        }
      }
    }

    const optionsList: CartItemOption[] = Object.entries(selectedOptions).map(([groupId, opt]) => {
      const group = activeItem.optionGroups?.find(g => g.id === groupId);
      return {
        groupId,
        groupName: group ? group.name[lang] : groupId,
        optionId: opt.id,
        optionName: opt.name[lang],
        price: opt.price
      };
    });

    const itemTotal = (activeItem.price + optionsList.reduce((acc, o) => acc + o.price, 0)) * itemQuantity;

    const newCartItem: CartItem = {
      id: `${activeItem.id}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      menuItem: activeItem,
      quantity: itemQuantity,
      selectedOptions: optionsList,
      specialInstructions: specialNotes.trim(),
      itemTotal
    };

    setCart(prev => [...prev, newCartItem]);
    setActiveItem(null);
  };

  // Mise à jour de quantité dans le panier
  const updateCartQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => {
      return prev.map(ci => {
        if (ci.id === cartItemId) {
          const newQty = ci.quantity + delta;
          if (newQty <= 0) return null;
          const unitPrice = ci.menuItem.price + ci.selectedOptions.reduce((a, b) => a + b.price, 0);
          return {
            ...ci,
            quantity: newQty,
            itemTotal: unitPrice * newQty
          };
        }
        return ci;
      }).filter(Boolean) as CartItem[];
    });
  };

  // Calculs financiers du panier
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.itemTotal, 0);
  }, [cart]);

  const tipAmount = useMemo(() => {
    return Math.round((cartSubtotal * selectedTip) * 100) / 100;
  }, [cartSubtotal, selectedTip]);

  const totalCartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const cartTotal = useMemo(() => {
    return cartSubtotal + tipAmount;
  }, [cartSubtotal, tipAmount]);

  // Filtrage des plats
  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchCat = selectedCategory === "all" || item.categoryId === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        item.name[lang].toLowerCase().includes(q) ||
        item.description[lang].toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [menuItems, selectedCategory, searchQuery, lang]);

  // Validation de la commande
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);

    const orderId = `SR-${Math.floor(100000 + Math.random() * 900000)}`;
    const orderPayload = {
      order_id: orderId,
      instance_name: rawInstance,
      restaurant_name: restaurant.name,
      table_number: tableNumber,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      customer_name: customerName || "Guest",
      items: cart.map(c => ({
        id: c.menuItem.id,
        name: c.menuItem.name[lang],
        quantity: c.quantity,
        options: c.selectedOptions.map(o => `${o.groupName}: ${o.optionName} (+${o.price} ${restaurant.currency})`),
        special_instructions: c.specialInstructions,
        price: c.itemTotal
      })),
      subtotal: cartSubtotal,
      tip: tipAmount,
      total_amount: cartTotal,
      currency: restaurant.currency,
      payment_method: paymentMethod,
      timestamp: new Date().toISOString()
    };

    try {
      // Sauvegarder dans localStorage pour la page de succès et suivi en direct
      if (typeof window !== 'undefined') {
        localStorage.setItem('sr_last_order', JSON.stringify(orderPayload));
        if (customerPhone) localStorage.setItem('user_phone', customerPhone);
        if (customerEmail) localStorage.setItem('user_email', customerEmail);

        // Ajouter automatiquement au tableau de bord KDS de la cuisine
        try {
          const storedOrders = localStorage.getItem('sr_kitchen_orders_v5');
          const currentList = storedOrders ? JSON.parse(storedOrders) : [];
          const updatedList = [{ ...orderPayload, status: 'recue' }, ...currentList];
          localStorage.setItem('sr_kitchen_orders_v5', JSON.stringify(updatedList));

          // Émettre vers l'écran KDS ouvert en direct
          const channel = new BroadcastChannel('sr_order_sync');
          channel.postMessage({ type: 'NEW_ORDER', order: orderPayload });
          channel.close();
        } catch (e) {}
      }

      // Envoi garanti à l'API interne du serveur pour affichage immédiat sur tous les écrans
      try {
        await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload),
          keepalive: true
        });
      } catch (apiErr) {
        console.log('Envoi /api/orders:', apiErr);
      }

      setIsSubmitting(false);
      setOrderSuccess(true);
      router.push(`/order/${rawInstance}/success?orderId=${orderId}&table=${tableNumber}`);

    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  // Helper pour les icônes de catégorie
  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles': return <Sparkles className="w-4 h-4" />;
      case 'Flame': return <Flame className="w-4 h-4" />;
      case 'UtensilsCrossed': return <UtensilsCrossed className="w-4 h-4" />;
      case 'Coffee': return <Coffee className="w-4 h-4" />;
      case 'Cake': return <Cake className="w-4 h-4" />;
      default: return <Utensils className="w-4 h-4" />;
    }
  };

  return (
    <div 
      dir={isRTL ? 'rtl' : 'ltr'} 
      className="min-h-screen bg-gradient-to-b from-[#FAF8F5] via-[#F4EFEA] to-[#EFE7DC] text-[#2E2722] font-sans antialiased selection:bg-[#C5A880]/30"
      style={{ fontFamily: "'Cairo', system-ui, -apple-system, sans-serif" }}
    >
      {/* HEADER ÉLÉGANT & SÉLECTEUR DE TABLE */}
      <header className="sticky top-0 z-30 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E8DFD5] shadow-sm transition-all duration-300">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          
          {/* Logo & Table Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4C3B3] to-[#B39F8D] p-0.5 shadow-inner flex items-center justify-center text-white font-bold text-lg">
              <span className="drop-shadow-sm">{restaurant.name.charAt(0)}</span>
            </div>
            <div>
              <h1 className="font-bold text-base md:text-lg text-[#2E2722] leading-tight">
                {restaurant.name}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <button 
                  onClick={() => { setTempTableInput(tableNumber); setShowTableModal(true); }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EAE0D5] hover:bg-[#DFCDBF] text-[#4A3D34] transition-colors border border-[#D5C4B4]"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
                  <span>{t.table} <strong>{tableNumber}</strong></span>
                  <span className="text-[10px] opacity-75 underline">({t.changeTable})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Langue & Bouton Panier Rapide */}
          <div className="flex items-center gap-2">
            {/* Bouton de langue */}
            <div className="flex bg-[#EAE0D5] p-0.5 rounded-full border border-[#D5C4B4]">
              {(['ar', 'fr', 'en'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-full transition-all duration-200 ${
                    lang === l 
                      ? 'bg-[#3D352E] text-[#FAF8F5] shadow-sm' 
                      : 'text-[#6E5D4F] hover:text-[#2E2722]'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Bouton Panier si éléments présents */}
            {cart.length > 0 && (
              <button
                onClick={() => setShowCartDrawer(true)}
                className="relative flex items-center justify-center w-10 h-10 rounded-full bg-[#3D352E] text-[#FAF8F5] shadow-md hover:bg-[#241E1A] transition-transform active:scale-95"
              >
                <ShoppingBag className="w-5 h-5 text-[#EFE7DC]" />
                <span className="absolute -top-1 -right-1 bg-[#C5A880] text-[#241E1A] text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                  {totalCartCount}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* BANNIÈRE D'ACCUEIL & AMBIANCE */}
      <section className="max-w-4xl mx-auto px-4 pt-4 pb-2">
        <div className="relative rounded-3xl overflow-hidden shadow-lg border border-[#E8DFD5] bg-[#3D352E]">
          <img 
            src={restaurant.coverImage} 
            alt={restaurant.name}
            className="w-full h-36 md:h-48 object-cover opacity-75 hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#241E1A]/95 via-[#241E1A]/40 to-transparent flex flex-col justify-end p-5 text-white">
            <div className="flex items-center gap-2 text-xs text-[#DFCDBF] mb-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>{t.openHours}</span>
              <span>•</span>
              <span>{restaurant.city}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-[#FAF8F5]">
              {restaurant.name}
            </h2>
          </div>
        </div>
      </section>

      {/* BARRE DE RECHERCHE & FILTRES CATÉGORIES */}
      <section className="sticky top-[61px] z-20 bg-[#FAF8F5]/95 backdrop-blur-md pt-3 pb-2 border-b border-[#E8DFD5]/60 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 space-y-3">
          
          {/* Champ de recherche */}
          <div className="relative">
            <Search className={`absolute ${isRTL ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7A6B]`} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 rounded-2xl bg-[#EFE8DF] border border-[#D5C4B4] text-[#2E2722] placeholder-[#8C7A6B] text-sm focus:outline-none focus:ring-2 focus:ring-[#B39F8D] transition-all`}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-[#8C7A6B] hover:text-[#2E2722]`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Onglets des catégories (Scroll horizontal doux) */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200 shrink-0 ${
                    isSelected
                      ? 'bg-[#3D352E] text-[#FAF8F5] shadow-md scale-[1.02]'
                      : 'bg-[#EAE0D5] text-[#5C4D41] hover:bg-[#DFCDBF] border border-[#D5C4B4]'
                  }`}
                >
                  <span className={isSelected ? 'text-[#C5A880]' : 'text-[#8C7A6B]'}>
                    {getCategoryIcon(cat.icon)}
                  </span>
                  <span>{cat.name[lang]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* LISTE DES PLATS & CARTES GOURMET */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-[#F3ECE2] rounded-3xl border border-[#E0D5C7] p-8">
            <Utensils className="w-12 h-12 text-[#9E8C7D] mx-auto mb-3 opacity-60" />
            <h3 className="text-lg font-bold text-[#3D352E] mb-1">{t.emptyCart}</h3>
            <p className="text-sm text-[#7A695B]">{t.emptyCartSub}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map((item) => (
              <div 
                key={item.id}
                onClick={() => handleOpenItem(item)}
                className="group relative bg-[#FAF8F5] rounded-3xl p-4 border border-[#E5DAD0] shadow-sm hover:shadow-md hover:border-[#C5A880] transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                <div className="flex gap-3.5">
                  {/* Photo du plat */}
                  <div className="relative w-28 h-28 md:w-32 md:h-32 shrink-0 rounded-2xl overflow-hidden bg-[#E8DDD0] shadow-inner">
                    <img 
                      src={item.image} 
                      alt={item.name[lang]}
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                    />
                    {item.isChefPick && (
                      <span className="absolute top-1.5 right-1.5 bg-[#3D352E]/90 backdrop-blur-sm text-[#EFE7DC] text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                        <Sparkles className="w-2.5 h-2.5 text-[#C5A880]" />
                        {t.chefPick}
                      </span>
                    )}
                  </div>

                  {/* Infos du plat */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <h3 className="font-bold text-sm md:text-base text-[#2E2722] group-hover:text-[#8C6D48] transition-colors line-clamp-1">
                          {item.name[lang]}
                        </h3>
                      </div>
                      <p className="text-xs text-[#7A695B] line-clamp-2 leading-relaxed mb-2">
                        {item.description[lang]}
                      </p>
                    </div>

                    {/* Badges diététiques & Calories */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-[#8C7A6B]">
                      {item.calories && (
                        <span className="flex items-center gap-0.5 bg-[#EFE8DF] px-2 py-0.5 rounded-md">
                          <CalorieIcon className="w-3 h-3 text-orange-500" />
                          {item.calories} {t.calories}
                        </span>
                      )}
                      {item.isSpicy && (
                        <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded-md border border-red-200">
                          🌶️ {t.spicy}
                        </span>
                      )}
                      {item.isVegetarian && (
                        <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md border border-emerald-200">
                          🌱 {t.veg}
                        </span>
                      )}
                      {item.isGlutenFree && (
                        <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md border border-amber-200">
                          🌾 {t.glutenFree}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Barre inférieure : Prix & Bouton Ajout */}
                <div className="mt-3 pt-2.5 border-t border-[#EFE8DF] flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg md:text-xl font-black text-[#2E2722]">
                      {item.price}
                    </span>
                    <span className="text-xs font-bold text-[#8C7A6B]">
                      {t.currency}
                    </span>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleOpenItem(item); }}
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#EAE0D5] group-hover:bg-[#3D352E] text-[#3D352E] group-hover:text-[#FAF8F5] text-xs font-bold transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.addToCart}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* BARRE FLOTTANTE PANIER (STICKY BOTTOM BAR) */}
      {cart.length > 0 && !showCartDrawer && (
        <div className="fixed bottom-4 inset-x-0 z-40 px-4 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              onClick={() => setShowCartDrawer(true)}
              className="w-full bg-[#3D352E] hover:bg-[#241E1A] text-[#FAF8F5] rounded-3xl p-3.5 shadow-2xl flex items-center justify-between border-2 border-[#C5A880]/40 transition-transform active:scale-[0.98] animate-bounce-short"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#C5A880] text-[#241E1A] flex items-center justify-center font-black text-sm shadow">
                  {totalCartCount}
                </div>
                <div className="text-start">
                  <div className="text-xs text-[#DFCDBF] font-semibold">{t.table} {tableNumber}</div>
                  <div className="text-sm font-black">{t.viewCart}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-base font-black text-[#FAF8F5]">
                  {cartTotal.toFixed(2)} {t.currency}
                </span>
                {isRTL ? <ChevronLeft className="w-5 h-5 text-[#C5A880]" /> : <ChevronRight className="w-5 h-5 text-[#C5A880]" />}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* MODAL PERSONNALISATION DU PLAT */}
      {activeItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-[#FAF8F5] rounded-t-3xl md:rounded-3xl max-h-[90vh] overflow-y-auto shadow-2xl border border-[#E5DAD0] flex flex-col">
            
            {/* Image Header & Bouton Fermer */}
            <div className="relative h-52 md:h-60 bg-[#3D352E] shrink-0">
              <img 
                src={activeItem.image} 
                alt={activeItem.name[lang]} 
                className="w-full h-full object-cover"
              />
              <button 
                onClick={() => setActiveItem(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#241E1A]/80 text-white flex items-center justify-center hover:bg-[#241E1A] transition-colors backdrop-blur-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenu de personnalisation */}
            <div className="p-5 flex-1 space-y-5">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-xl font-black text-[#2E2722]">
                    {activeItem.name[lang]}
                  </h2>
                  <span className="text-lg font-black text-[#8C6D48] whitespace-nowrap">
                    {activeItem.price} {t.currency}
                  </span>
                </div>
                <p className="text-xs text-[#7A695B] leading-relaxed mt-1">
                  {activeItem.description[lang]}
                </p>
              </div>

              {/* Groupes d'options (ex: Cuisson, suppléments) */}
              {activeItem.optionGroups?.map((group) => (
                <div key={group.id} className="space-y-2 pt-2 border-t border-[#EFE8DF]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#3D352E]">
                      {group.name[lang]}
                    </label>
                    {group.required && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        {t.optionsRequired}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {group.options.map((opt) => {
                      const isSelected = selectedOptions[group.id]?.id === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => {
                            setSelectedOptions(prev => ({
                              ...prev,
                              [group.id]: opt
                            }));
                          }}
                          className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-semibold cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[#3D352E] text-[#FAF8F5] border-[#3D352E] shadow-sm'
                              : 'bg-[#F3ECE2] text-[#4A3D34] border-[#E0D5C7] hover:bg-[#EAE0D5]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-[#C5A880] bg-[#C5A880]' : 'border-[#9E8C7D]'
                            }`}>
                              {isSelected && <Check className="w-2.5 h-2.5 text-[#241E1A]" />}
                            </div>
                            <span>{opt.name[lang]}</span>
                          </div>

                          {opt.price > 0 && (
                            <span className={isSelected ? 'text-[#DFCDBF]' : 'text-[#8C7A6B]'}>
                              +{opt.price} {t.currency}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Instructions spéciales */}
              <div className="pt-2 border-t border-[#EFE8DF] space-y-1.5">
                <label className="text-xs font-bold text-[#3D352E]">
                  {t.specialNotes}
                </label>
                <textarea
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder={t.specialNotesPlaceholder}
                  rows={2}
                  className="w-full p-3 rounded-2xl bg-[#EFE8DF] border border-[#D5C4B4] text-xs text-[#2E2722] focus:outline-none focus:ring-2 focus:ring-[#B39F8D]"
                />
              </div>
            </div>

            {/* Pied de modale : Quantité & Validation */}
            <div className="p-4 bg-[#F4EFEA] border-t border-[#E5DAD0] flex items-center gap-3">
              {/* Sélecteur quantité */}
              <div className="flex items-center gap-2 bg-[#EAE0D5] p-1 rounded-2xl border border-[#D5C4B4]">
                <button
                  onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                  className="w-8 h-8 rounded-xl bg-[#FAF8F5] text-[#3D352E] flex items-center justify-center font-bold shadow-sm hover:bg-[#E0D5C7]"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-6 text-center font-black text-sm text-[#2E2722]">
                  {itemQuantity}
                </span>
                <button
                  onClick={() => setItemQuantity(itemQuantity + 1)}
                  className="w-8 h-8 rounded-xl bg-[#FAF8F5] text-[#3D352E] flex items-center justify-center font-bold shadow-sm hover:bg-[#E0D5C7]"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Bouton Ajouter */}
              <button
                onClick={handleAddToCart}
                className="flex-1 bg-[#3D352E] hover:bg-[#241E1A] text-[#FAF8F5] py-3.5 px-4 rounded-2xl font-bold text-sm shadow-md flex items-center justify-between transition-all"
              >
                <span>{t.addToCart}</span>
                <span className="text-[#C5A880] font-black">
                  {(currentModalItemPrice * itemQuantity).toFixed(2)} {t.currency}
                </span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DRAWER / MODALE PANIER DÉTAILLÉ */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-[#FAF8F5] rounded-t-3xl md:rounded-3xl max-h-[92vh] overflow-y-auto shadow-2xl border border-[#E5DAD0] flex flex-col">
            
            {/* Header Panier */}
            <div className="p-4 border-b border-[#E5DAD0] flex items-center justify-between bg-[#F4EFEA]">
              <div>
                <h2 className="text-lg font-black text-[#2E2722]">
                  {t.cartTitle}
                </h2>
                <div className="text-xs text-[#8C7A6B]">
                  {restaurant.name} • {t.table} <strong>{tableNumber}</strong>
                </div>
              </div>
              <button 
                onClick={() => setShowCartDrawer(false)}
                className="w-8 h-8 rounded-full bg-[#EAE0D5] hover:bg-[#DFCDBF] flex items-center justify-center text-[#4A3D34]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Liste des articles du panier */}
            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
              {cart.map((cartItem) => (
                <div 
                  key={cartItem.id}
                  className="bg-[#F4EFEA] p-3.5 rounded-2xl border border-[#E5DAD0] space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-[#2E2722]">
                        {cartItem.menuItem.name[lang]}
                      </h4>
                      {cartItem.selectedOptions.length > 0 && (
                        <div className="text-[11px] text-[#7A695B] mt-0.5 space-y-0.5">
                          {cartItem.selectedOptions.map((opt, idx) => (
                            <div key={idx}>• {opt.optionName}</div>
                          ))}
                        </div>
                      )}
                      {cartItem.specialInstructions && (
                        <div className="text-[11px] text-amber-800 italic mt-0.5">
                          "{cartItem.specialInstructions}"
                        </div>
                      )}
                    </div>

                    <span className="font-black text-sm text-[#3D352E] whitespace-nowrap">
                      {cartItem.itemTotal.toFixed(2)} {t.currency}
                    </span>
                  </div>

                  {/* Contrôle quantité par ligne */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#E8DFD5]">
                    <div className="flex items-center gap-2 bg-[#EAE0D5] p-0.5 rounded-xl border border-[#D5C4B4]">
                      <button
                        onClick={() => updateCartQuantity(cartItem.id, -1)}
                        className="w-6 h-6 rounded-lg bg-[#FAF8F5] text-[#3D352E] flex items-center justify-center font-bold text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center font-bold text-xs">
                        {cartItem.quantity}
                      </span>
                      <button
                        onClick={() => updateCartQuantity(cartItem.id, 1)}
                        className="w-6 h-6 rounded-lg bg-[#FAF8F5] text-[#3D352E] flex items-center justify-center font-bold text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => updateCartQuantity(cartItem.id, -cartItem.quantity)}
                      className="text-[11px] text-red-600 hover:underline font-semibold"
                    >
                      {isRTL ? "حذف" : "Supprimer"}
                    </button>
                  </div>
                </div>
              ))}

              {/* Coordonnées Client pour Reçu, Facture et Fidélité */}
              <div className="p-3.5 bg-[#EFE8DF] rounded-2xl border border-[#D5C4B4] space-y-3 mt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#3D352E] flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-[#8C6D48]" />
                    {t.phone}
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="05XXXXXXXX / +974..."
                    className="w-full p-2.5 rounded-xl bg-[#FAF8F5] border border-[#D5C4B4] text-xs text-[#2E2722] focus:ring-2 focus:ring-[#B39F8D]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#3D352E] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#8C6D48]" />
                    {t.email}
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder={t.emailPlaceholder}
                    className="w-full p-2.5 rounded-xl bg-[#FAF8F5] border border-[#D5C4B4] text-xs text-[#2E2722] focus:ring-2 focus:ring-[#B39F8D]"
                  />
                </div>
              </div>

              {/* Pourboire / Tip Selector */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-[#3D352E]">
                  {t.tip}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 0.05, 0.10, 0.15].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => setSelectedTip(rate)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        selectedTip === rate
                          ? 'bg-[#3D352E] text-[#FAF8F5] border-[#3D352E]'
                          : 'bg-[#F3ECE2] text-[#5C4D41] border-[#E0D5C7] hover:bg-[#EAE0D5]'
                      }`}
                    >
                      {rate === 0 ? "0%" : `${rate * 100}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Choix Mode de Paiement */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-[#3D352E]">
                  {t.paymentMethod}
                </label>
                <div className="space-y-2">
                  {/* Apple Pay */}
                  <div
                    onClick={() => setPaymentMethod('apple_pay')}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      paymentMethod === 'apple_pay'
                        ? 'bg-[#241E1A] text-white border-[#241E1A] shadow-md'
                        : 'bg-[#F3ECE2] text-[#2E2722] border-[#E0D5C7] hover:bg-[#EAE0D5]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 font-bold text-xs">
                      <span className="text-base"></span>
                      <span>{t.applePay}</span>
                    </div>
                    {paymentMethod === 'apple_pay' && <CheckCircle2 className="w-4 h-4 text-[#C5A880]" />}
                  </div>

                  {/* Mada / Carte Bancaire */}
                  <div
                    onClick={() => setPaymentMethod('card')}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      paymentMethod === 'card'
                        ? 'bg-[#3D352E] text-white border-[#3D352E] shadow-md'
                        : 'bg-[#F3ECE2] text-[#2E2722] border-[#E0D5C7] hover:bg-[#EAE0D5]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 font-bold text-xs">
                      <CreditCard className="w-4 h-4 text-[#C5A880]" />
                      <span>{t.cardPay}</span>
                    </div>
                    {paymentMethod === 'card' && <CheckCircle2 className="w-4 h-4 text-[#C5A880]" />}
                  </div>

                  {/* Paiement en Caisse */}
                  <div
                    onClick={() => setPaymentMethod('counter')}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      paymentMethod === 'counter'
                        ? 'bg-[#3D352E] text-white border-[#3D352E] shadow-md'
                        : 'bg-[#F3ECE2] text-[#2E2722] border-[#E0D5C7] hover:bg-[#EAE0D5]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 font-bold text-xs">
                      <Utensils className="w-4 h-4 text-[#C5A880]" />
                      <span>{t.counterPay}</span>
                    </div>
                    {paymentMethod === 'counter' && <CheckCircle2 className="w-4 h-4 text-[#C5A880]" />}
                  </div>
                </div>
              </div>

              {/* Récapitulatif Total */}
              <div className="p-3.5 bg-[#EAE0D5] rounded-2xl border border-[#D5C4B4] space-y-1.5 text-xs">
                <div className="flex justify-between text-[#5C4D41]">
                  <span>{t.subtotal}</span>
                  <span className="font-semibold">{cartSubtotal.toFixed(2)} {t.currency}</span>
                </div>
                {tipAmount > 0 && (
                  <div className="flex justify-between text-[#5C4D41]">
                    <span>{t.tip}</span>
                    <span className="font-semibold">+{tipAmount.toFixed(2)} {t.currency}</span>
                  </div>
                )}
                <div className="flex justify-between text-[11px] text-[#8C7A6B]">
                  <span>{t.vat}</span>
                  <span>{t.confirm}</span>
                </div>
                <div className="pt-2 border-t border-[#D5C4B4] flex justify-between text-sm font-black text-[#2E2722]">
                  <span>{t.total}</span>
                  <span className="text-base text-[#8C6D48]">{cartTotal.toFixed(2)} {t.currency}</span>
                </div>
              </div>
            </div>

            {/* Action Commander */}
            <div className="p-4 bg-[#F4EFEA] border-t border-[#E5DAD0]">
              <button
                disabled={isSubmitting || cart.length === 0}
                onClick={handlePlaceOrder}
                className="w-full bg-[#3D352E] hover:bg-[#241E1A] disabled:bg-gray-400 text-[#FAF8F5] py-4 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{t.orderProcessing}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-[#C5A880]" />
                    <span>{t.orderNow} • {cartTotal.toFixed(2)} {t.currency}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL CHANGEMENT NUMÉRO DE TABLE (GRILLE INTERACTIVE 1 À TOTAL_TABLES) */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-[#FAF8F5] rounded-3xl p-5 border border-[#E5DAD0] shadow-2xl space-y-4">
            
            <div className="text-center">
              <h3 className="font-black text-base text-[#2E2722]">{t.enterTable}</h3>
              <p className="text-xs text-[#8C7A6B] mt-0.5">
                {lang === 'ar' ? `اختر من 1 إلى ${restaurant.totalTables || 20}` : (lang === 'fr' ? `Tables disponibles (1 à ${restaurant.totalTables || 20})` : `Available tables (1 to ${restaurant.totalTables || 20})`)}
              </p>
            </div>

            {/* Grille interactive de tables rapides */}
            <div className="max-h-48 overflow-y-auto p-1 grid grid-cols-4 sm:grid-cols-5 gap-2 scrollbar-thin">
              {Array.from({ length: restaurant.totalTables || 20 }, (_, i) => {
                const numStr = String(i + 1).padStart(2, '0');
                const isCurrent = tempTableInput === numStr || tempTableInput === String(i + 1);
                return (
                  <button
                    key={i}
                    onClick={() => setTempTableInput(numStr)}
                    className={`py-2.5 rounded-xl font-black text-xs transition-all border ${
                      isCurrent
                        ? 'bg-[#3D352E] text-[#FAF8F5] border-[#3D352E] shadow-sm scale-105 ring-2 ring-[#C5A880]'
                        : 'bg-[#F3ECE2] text-[#4A3D34] border-[#E0D5C7] hover:bg-[#EAE0D5]'
                    }`}
                  >
                    {numStr}
                  </button>
                );
              })}
            </div>

            {/* Champ de saisie personnalisé (ex: VIP, Terrasse) */}
            <div className="pt-2 border-t border-[#E8DFD5] space-y-1.5 text-center">
              <label className="text-[11px] font-bold text-[#8C7A6B]">
                {lang === 'ar' ? "أو اكتب رقم / اسم طاولة مخصص (مثل VIP-1)" : (lang === 'fr' ? "Ou numéro personnalisé (ex: VIP-1, Terrasse)" : "Or custom table name (e.g. VIP-1)")}
              </label>
              <input
                type="text"
                value={tempTableInput}
                onChange={(e) => setTempTableInput(e.target.value)}
                placeholder="01, 12, VIP-1..."
                className="w-full text-center text-sm font-black p-2.5 rounded-xl bg-[#EFE8DF] border border-[#D5C4B4] text-[#2E2722] focus:ring-2 focus:ring-[#B39F8D]"
              />
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowTableModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#EAE0D5] text-[#5C4D41] font-bold text-xs hover:bg-[#DFCDBF]"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => {
                  if (tempTableInput.trim()) {
                    setTableNumber(tempTableInput.trim());
                    if (typeof window !== 'undefined') {
                      sessionStorage.setItem('sr_table_num', tempTableInput.trim());
                    }
                  }
                  setShowTableModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#3D352E] text-[#FAF8F5] font-bold text-xs hover:bg-[#241E1A] shadow-md"
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER SOBRE & SIGNATURE */}
      <footer className="max-w-4xl mx-auto px-4 py-8 text-center text-xs text-[#8C7A6B] space-y-1">
        <p>{t.poweredBy}</p>
        <p className="text-[10px] opacity-75">© {new Date().getFullYear()} {restaurant.name} • Smart Review v5.0</p>
      </footer>
    </div>
  );
}
