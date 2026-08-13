'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { 
  Sparkles, Wifi, Utensils, Camera, Flame, Activity, ShieldCheck, 
  Globe, Award, Check, X, RefreshCw, Trophy, HeartPulse, Gift, Mic
} from 'lucide-react';

const N8N_RESTAURANTS_API = "https://n8n.srv821341.hstgr.cloud/webhook/get-restaurants";
const N8N_WIFI_LEADS_API = "https://n8n.srv821341.hstgr.cloud/webhook/save-wifi-lead-v2";
const N8N_AI_FOOD_VISION_API = "https://n8n.srv821341.hstgr.cloud/webhook/ai-food-vision-v4";

// DÉPAQUETEUR N8N UNIVERSEL ({ json: { ... } } vs { ... })
const getItemData = (r: any) => (r && typeof r === 'object' && r.json) ? r.json : r;

const normalizeKey = (str: any): string => {
  if (!str) return "";
  const item = getItemData(str);
  const raw = typeof item === 'object' ? (item.instance_name || item.restaurant_name || "") : item;
  return String(raw).toLowerCase().replace(/[^a-z0-9]/g, "").trim();
};

const parseInstanceName = (rawItem: any): string => {
  if (!rawItem) return "";
  const item = getItemData(rawItem);

  if (typeof item === 'string') return item.trim();
  if (Array.isArray(item) && item.length > 0) {
    const first = getItemData(item[0]);
    if (typeof first === 'string') return first.trim();
    if (typeof first === 'object' && first !== null) {
      return (first.instance_name || first.restaurant_name || "").trim();
    }
  }
  if (typeof item === 'object' && item !== null) {
    return (item.instance_name || item.restaurant_name || "").trim();
  }
  return "";
};

export default function LuxuryRestaurantPortalV4() {
  const params = useParams();
  const searchParams = useSearchParams();

  const [lang, setLang] = useState<'ar' | 'fr' | 'en'>('ar');
  const [loadingRest, setLoadingRest] = useState(false);

  const [clientPhone, setClientPhone] = useState('');

  const [fitnessLevel, setFitnessLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [userNotes, setUserNotes] = useState('');
  
  // Auto-détection de la langue du téléphone
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userLang = (navigator.language || (navigator as any).userLanguage || 'ar').toLowerCase();
      if (userLang.startsWith('fr')) setLang('fr');
      else if (userLang.startsWith('en')) setLang('en');
      else setLang('ar');
    }
  }, []);

  // Charger automatiquement le téléphone s'il a déjà été saisi ou passé dans l'URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlPhone = searchParams?.get('phone') || searchParams?.get('client_phone') || '';
      const storedPhone = localStorage.getItem('user_phone') || '';
      const phoneToUse = urlPhone || storedPhone;
      
      if (phoneToUse) {
        setClientPhone(phoneToUse);
      }
    }
  }, [searchParams]);
  
  // Extraction dynamique propre depuis l'URL (sans valeurs en dur)
  const paramInst = typeof params?.instance === 'string' ? params.instance : (searchParams.get('instance') || '');
  let rawInstance = paramInst.trim().toLowerCase();

  if (typeof window !== 'undefined' && !rawInstance) {
    const parts = window.location.pathname.split('/spin/');
    if (parts.length > 1) {
      rawInstance = parts[1].split('/')[0].split('?')[0].trim().toLowerCase();
    }
  }

  // Nom d'affichage généré dynamiquement depuis l'URL
  const formattedUrlName = rawInstance
    ? rawInstance.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : "";

  const [restaurantData, setRestaurantData] = useState<any>({
    restaurant_name: formattedUrlName,
    city: "",
    reward_offer: "",
    wifi_password: "",
    menu_url: "#",
    linked_evolution: ""
  });

  // Modals States
  const [activeModal, setActiveModal] = useState<'wifi' | 'food_ai' | null>(null);

  // Spin Wheel State (ROUE V3)
  const [mustSpin, setMustSpin] = useState(false);
  const [rotationDegree, setRotationDegree] = useState(0);
  const [showWinnerModal, setShowWinnerModal] = useState(false);

  // WiFi Lead Form
  const [wifiPhone, setWifiPhone] = useState('');
  const [wifiLoading, setWifiLoading] = useState(false);
  const [wifiSuccess, setWifiSuccess] = useState(false);

  // AI Food Vision Form
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [clientEmail, setClientEmail] = useState('');
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  // CHARGEMENT DYNAMIQUE NOCODB
  useEffect(() => {
    const loadRestaurant = async () => {
      const targetKey = normalizeKey(rawInstance);
      if (!targetKey) return;
    
      setLoadingRest(true);
    
      try {
        const res = await fetch(`${N8N_RESTAURANTS_API}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) {
          console.error("Erreur API restaurants");
          return;
        }
    
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.list || data.data || []);
    
        // Matching strict d'abord
        let matched = list.find((r: any) => {
          const item = getItemData(r);
          const dbKey = normalizeKey(item.instance_name || item.restaurant_name);
          return dbKey === targetKey;
        });
    
        // Matching souple si besoin
        if (!matched && targetKey.length >= 3) {
          matched = list.find((r: any) => {
            const item = getItemData(r);
            const dbKey = normalizeKey(item.instance_name || item.restaurant_name);
            return dbKey.includes(targetKey) || targetKey.includes(dbKey);
          });
        }
    
        if (matched) {
          const item = getItemData(matched);
          const rawPhone = item.linked_evolution || item.manager_whatsapp || "";
          const botPhone = String(rawPhone).replace(/[^0-9]/g, '');
    
          setRestaurantData({
            restaurant_name: item.restaurant_name || formattedUrlName,
            city: item.city || "",
            reward_offer: item.reward_offer || item.loyalty_reward || "1 hot drink",
            wifi_password: item.wifi_password || "",
            menu_url: item.menu_url || "#",
            linked_evolution: botPhone,
            found: true
          });
        } else {
          setRestaurantData({
            restaurant_name: formattedUrlName,
            city: "",
            reward_offer: "",
            wifi_password: "",
            menu_url: "#",
            linked_evolution: "",
            found: false
          });
        }
      } catch (e) {
        console.error("Erreur chargement restaurant:", e);
      } finally {
        setLoadingRest(false);
      }
    };
    
    loadRestaurant();
  }, [rawInstance]);

  // ANIMATION ROTATION ROUE V3
  const handleSpinWheel = () => {
    if (mustSpin) return;
    setMustSpin(true);
    setShowWinnerModal(false);

    const extraTurns = 360 * 6;
    const stopAngle = Math.floor(Math.random() * 300) + 30;
    const newTotalDegree = rotationDegree + extraTurns + stopAngle;

    setRotationDegree(newTotalDegree);

    setTimeout(() => {
      setMustSpin(false);
      setShowWinnerModal(true);
    }, 4200);
  };

  // Soumission Formulaire WiFi
  const handleWifiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wifiPhone.trim()) return;
    setWifiLoading(true);

    try {
      await fetch(N8N_WIFI_LEADS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_phone: wifiPhone.trim(),
          instance_name: rawInstance,
          source: 'WiFi'
        })
      });
      setWifiSuccess(true);
    } catch (e) {
      setWifiSuccess(true);
    } finally {
      setWifiLoading(false);
    }
  };

  // Chargement de la photo dans le state (sans déclenchement automatique d'analyse)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Lancement manuel de l'analyse IA
  const analyzeFoodImage = async () => {
    if (!selectedImage) return;

    // ⛔ BLOQUAGE STRICT SI LE NUMÉRO EST VIDE
    const phoneToSend = (clientPhone || wifiPhone || "").trim();
    if (!phoneToSend) {
      alert(
        lang === 'ar' ? 'يرجى إدخال رقم الواتساب أولاً!' :
        lang === 'fr' ? 'Veuillez entrer votre numéro WhatsApp !' :
        'Please enter your WhatsApp number!'
      );
      return;
    }
  
    if (!clientEmail.trim()) {
      alert(
        lang === 'ar' ? 'يرجى إدخال البريد الإلكتروني لاستلام الخطة الكاملة!' :
        lang === 'fr' ? 'Veuillez entrer votre e-mail pour recevoir le bilan complet !' :
        'Please enter your email to receive full fitness report!'
      );
      return;
    }
  
    setAiAnalysisLoading(true);
    setAiResult(null);
  
    const cleanBase64 = selectedImage.replace(/^data:image\/\w+;base64,/, '');
  
    try {
      const res = await fetch(N8N_AI_FOOD_VISION_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: cleanBase64,
          data: cleanBase64,
          phone: phoneToSend,
          client_phone: phoneToSend,
          client_email: clientEmail.trim(),
          fitness_level: fitnessLevel,
          user_notes: userNotes.trim(),
          language: lang,
          instance: rawInstance
        })
      });
  
      if (res.ok) {
        const data = await res.json();
        setAiResult(data);
      }
    } catch (err) {
      console.error("Erreur IA:", err);
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  // URL WHATSAPP DYNAMIQUE DU BOT RESTAURANT
  const botPhoneClean = String(restaurantData.linked_evolution || "").replace(/[^0-9]/g, '');

  const t = {
    ar: {
      portalTitle: "بوابة الضيافة الفاخرة",
      subTitle: "مرحباً بكم في",
      spinCardTitle: "عجلة الحظ والهدايا VIP",
      spinCardDesc: "أدر العجلة واكسب هدية فورية عند تقييمنا على جوجل",
      aiCardTitle: "مدرب التغذية واللياقة بالذكاء الاصطناعي",
      aiCardDesc: "التقط صورة لطبقك لمعرفة السعرات وحصة اللياقة المناسبة",
      wifiCardTitle: "شبكة الواي فاي المجانية",
      wifiCardDesc: "احصل على كلمة سر الواي فاي بضغطة واحدة",
      menuCardTitle: "قائمة الطعام الرقمية",
      menuCardDesc: "استعرض أشهى المأكولات والمشروبات",
      btnAi: "مسح الطبق بالذكاء الاصطناعي 📸",
      btnWifi: "احصل على كلمة السر 📶",
      btnMenu: "عرض القائمة 🍽️",
      wifiInputLabel: "أدخل رقم واتساب الخاص بك :",
      wifiBtnSubmit: "عرض كلمة السر 🔓",
      wifiPassSuccess: "كلمة سر الواي فاي هي :",
      aiUploadInstruction: "التقط صورة لطبقك أو مشروبك الآن :",
      aiAnalyzing: "جاري تحليل الطبق بالذكاء الاصطناعي...",
      calories: "السعرات الحرارية المقدرة :",
      workoutTitle: "حصة اللياقة المقترحة (بدون معدات) :",
      spinBtnAction: "أدر العجلة الآن 🎲",
      spinCongratsTitle: "🎉 مبروك! لقد كسبت :",
      spinCongratsDesc: "أرسل ملاحظة صوتية أو نصية عبر واتساب لاستلام هديتك فوراً في الكاشير!",
      sendReviewWhatsapp: "إرسال التقييم (صوتي أو نصي) 💬",
      step1: "1. فتح واتساب",
      step2: "2. صوتي أو نصي 🎙️",
      step3: "3. استلم هديتك 🎁",
      loadingText: "جاري تحميل بوابة المطعم...",
      poweredBy: "Smart Review AI v4.0 • Saudi F&B Vision 2030"
    },
    fr: {
      portalTitle: "PORTAIL DE GASTRONOMIE VIP",
      subTitle: "Bienvenue chez",
      spinCardTitle: "Roue de la Fortune & Cadeaux VIP",
      spinCardDesc: "Tournez la roue et gagnez un cadeau en laissant votre avis",
      aiCardTitle: "Coach IA Nutrition & Fitness Pass",
      aiCardDesc: "Scannez votre plat pour évaluer les calories & la séance fitness 12 min",
      wifiCardTitle: "Accès WiFi Haut Débit",
      wifiCardDesc: "Obtenez le mot de passe WiFi instantanément",
      menuCardTitle: "Menu & Carte du Restaurant",
      menuCardDesc: "Découvrez nos spécialités et boissons",
      btnAi: "Scanner mon Plat (IA) 📸",
      btnWifi: "Obtenir le Code WiFi 📶",
      btnMenu: "Consulter le Menu 🍽️",
      wifiInputLabel: "Entrez votre numéro WhatsApp :",
      wifiBtnSubmit: "Voir le Mot de Passe 🔓",
      wifiPassSuccess: "Mot de Passe WiFi :",
      aiUploadInstruction: "Prenez en photo votre plat ou boisson :",
      aiAnalyzing: "Analyse nutritionnelle IA en cours...",
      calories: "Calories estimées :",
      workoutTitle: "Séance Fitness 12 min (Sans matériel) :",
      spinBtnAction: "Tourner la Roue Maintenant 🎲",
      spinCongratsTitle: "🎉 FÉLICITATIONS ! VOUS AVEZ GAGNÉ :",
      spinCongratsDesc: "Envoyez un message vocal ou texte sur WhatsApp pour recevoir votre cadeau immédiatement en caisse !",
      sendReviewWhatsapp: "Envoyer mon avis (vocal ou texte) 💬",
      step1: "1. Ouvrir WhatsApp",
      step2: "2. Vocal ou texto 🎙️",
      step3: "3. Votre Cadeau 🎁",
      loadingText: "Chargement du Portail VIP...",
      poweredBy: "Smart Review AI v4.0 • Saudi F&B Vision 2030"
    },
    en: {
      portalTitle: "VIP HOSPITALITY PASS",
      subTitle: "Welcome to",
      spinCardTitle: "VIP Wheel of Fortune",
      spinCardDesc: "Spin the wheel & win a prize when leaving a Google review",
      aiCardTitle: "AI Nutrition & Fitness Coach",
      aiCardDesc: "Scan your dish to estimate calories & get a 12-min workout",
      wifiCardTitle: "High-Speed WiFi Access",
      wifiCardDesc: "Get the WiFi password instantly",
      menuCardTitle: "Digital Food Menu",
      menuCardDesc: "Browse our gourmet dishes & drinks",
      btnSpin: "Spin the Wheel 🎲",
      btnAi: "Scan My Meal (AI) 📸",
      btnWifi: "Get WiFi Password 📶",
      btnMenu: "Browse Menu 🍽️",
      wifiInputLabel: "Enter your WhatsApp Number:",
      wifiBtnSubmit: "Unlock Password 🔓",
      wifiPassSuccess: "WiFi Password:",
      aiUploadInstruction: "Take a photo of your meal or drink:",
      aiAnalyzing: "AI Nutritional Analysis in progress...",
      calories: "Estimated Calories:",
      workoutTitle: "Recommended 12-min Bodyweight Workout:",
      spinBtnAction: "Spin the Wheel Now 🎲",
      spinCongratsTitle: "🎉 CONGRATULATIONS! YOU WON:",
      spinCongratsDesc: "Send a voice note or text review on WhatsApp to claim your reward at the cashier!",
      sendReviewWhatsapp: "Send Review (Voice or Text) 💬",
      step1: "1. Tap to open",
      step2: "2. Voice or text 🎙️",
      step3: "3. Claim reward 🎁",
      loadingText: "Loading VIP Portal...",
      poweredBy: "Smart Review AI v4.0 • Saudi F&B Vision 2030"
    }
  }[lang];

  const toggleLanguage = () => {
    if (lang === 'ar') setLang('fr');
    else if (lang === 'fr') setLang('en');
    else setLang('ar');
  };

  return (
    <div 
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#090A0F] text-zinc-100 font-['Cairo',sans-serif] relative flex flex-col justify-between p-4 sm:p-6 overflow-x-hidden selection:bg-amber-500 selection:text-black"
    >
      <div className="fixed top-[-10%] right-[-10%] w-96 h-96 bg-amber-500/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-96 h-96 bg-emerald-500/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-xl mx-auto w-full space-y-6 relative z-10 my-auto">
        
        {/* HEADER */}
        <header className="flex justify-between items-center pt-2 px-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-amber-400">
              {t.portalTitle}
            </span>
          </div>

          <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/90 border border-amber-500/30 text-xs sm:text-sm font-black text-zinc-200 hover:text-amber-400 backdrop-blur-xl transition-all shadow-md"
          >
            <Globe className="w-4 h-4 text-amber-400" />
            {lang === 'ar' ? 'Français' : lang === 'fr' ? 'English' : 'العربية'}
          </button>
        </header>

        {/* HERO BANNER RESTAURANT DYNAMIQUE */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 via-amber-300 to-emerald-500 rounded-[28px] blur-sm opacity-70"></div>
          <div className="relative bg-[#14161F] border-2 border-amber-400/40 rounded-[26px] p-6 text-center space-y-2 shadow-2xl">
            <p className="text-xs sm:text-sm font-bold text-amber-400 uppercase tracking-widest">{t.subTitle}</p>
            <h1 className="text-3xl sm:text-4xl font-black text-white">{restaurantData.restaurant_name || formattedUrlName}</h1>
            {restaurantData.city && <p className="text-xs sm:text-sm text-zinc-400 font-bold">{restaurantData.city}</p>}
          </div>
        </div>

        {/* ROUE DE LA FORTUNE 3D */}
        <div className="bg-[#14161F] border-2 border-amber-500/40 p-6 sm:p-8 rounded-[26px] text-center space-y-5 shadow-2xl relative overflow-hidden">
          <div className="space-y-2">
            <div className="inline-flex p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl mb-1">
              <Trophy className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">{t.spinCardTitle}</h2>
            <p className="text-sm text-zinc-300 font-bold leading-relaxed">{t.spinCardDesc}</p>
          </div>

          <div className="relative w-64 h-64 aspect-square mx-auto my-3 shrink-0">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20 text-amber-400 text-2xl drop-shadow-md">
              ▼
            </div>
            
            <div 
              className="w-full h-full rounded-full border-4 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.5)] overflow-hidden origin-center"
              style={{ 
                transform: `rotate(${rotationDegree}deg)`,
                transition: mustSpin ? 'transform 4.5s cubic-bezier(0.15, 0.9, 0.2, 1)' : 'none'
              }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <g transform="translate(50,50)">
                  <path d="M0,0 L50,0 A50,50 0 0,1 25,43.3 Z" fill="#D4AF37" />
                  <text x="25" y="15" fill="#000" fontSize="4.5" fontWeight="900" textAnchor="middle" transform="rotate(30, 25, 15)">☕ OFFRE</text>

                  <path d="M0,0 L25,43.3 A50,50 0 0,1 -25,43.3 Z" fill="#14161F" />
                  <text x="0" y="28" fill="#D4AF37" fontSize="4.5" fontWeight="900" textAnchor="middle" transform="rotate(90, 0, 28)">🎁 CADEAU</text>

                  <path d="M0,0 L-25,43.3 A50,50 0 0,1 -50,0 Z" fill="#10B981" />
                  <text x="-25" y="15" fill="#000" fontSize="4.5" fontWeight="900" textAnchor="middle" transform="rotate(150, -25, 15)">⭐ WIN</text>

                  <path d="M0,0 L-50,0 A50,50 0 0,1 -25,-43.3 Z" fill="#D4AF37" />
                  <text x="-25" y="-12" fill="#000" fontSize="4.5" fontWeight="900" textAnchor="middle" transform="rotate(210, -25, -12)">🍰 CADEAU</text>

                  <path d="M0,0 L-25,-43.3 A50,50 0 0,1 25,-43.3 Z" fill="#14161F" />
                  <text x="0" y="-26" fill="#10B981" fontSize="4.5" fontWeight="900" textAnchor="middle" transform="rotate(270, 0, -26)">🥤 SURPRISE</text>

                  <path d="M0,0 L25,-43.3 A50,50 0 0,1 50,0 Z" fill="#10B981" />
                  <text x="25" y="-12" fill="#000" fontSize="4.5" fontWeight="900" textAnchor="middle" transform="rotate(330, 25, -12)">🏆 GAGNANT</text>
                </g>
              </svg>
            </div>
          </div>

          <button 
            onClick={handleSpinWheel}
            disabled={mustSpin}
            className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-zinc-950 font-black text-base py-4 rounded-2xl transition shadow-xl hover:opacity-95 active:scale-95 flex items-center justify-center gap-2"
          >
            {mustSpin ? <RefreshCw className="w-6 h-6 animate-spin" /> : t.spinBtnAction}
          </button>
        </div>

        {/* MODULES V4 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button 
            onClick={() => setActiveModal('food_ai')}
            className="bg-[#14161F] border border-emerald-500/40 p-4 rounded-2xl space-y-2 hover:border-emerald-400 transition text-start relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <HeartPulse className="w-7 h-7 text-emerald-400" />
              <span className="text-[10px] font-black bg-emerald-500 text-zinc-950 px-2 py-0.5 rounded">v4.0</span>
            </div>
            <div>
              <h3 className="text-sm font-black text-white">{t.aiCardTitle}</h3>
              <p className="text-xs text-zinc-300 mt-1 leading-snug">{t.aiCardDesc}</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveModal('wifi')}
            className="bg-[#14161F] border border-white/10 p-4 rounded-2xl space-y-2 hover:border-white/20 transition text-start"
          >
            <Wifi className="w-7 h-7 text-blue-400" />
            <div>
              <h3 className="text-sm font-black text-white">{t.wifiCardTitle}</h3>
              <p className="text-xs text-zinc-300 mt-1 leading-snug">{t.wifiCardDesc}</p>
            </div>
          </button>

          <a 
            href={restaurantData.menu_url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#14161F] border border-white/10 p-4 rounded-2xl space-y-2 hover:border-white/20 transition text-start block"
          >
            <Utensils className="w-7 h-7 text-purple-400" />
            <div>
              <h3 className="text-sm font-black text-white">{t.menuCardTitle}</h3>
              <p className="text-xs text-zinc-300 mt-1 leading-snug">{t.menuCardDesc}</p>
            </div>
          </a>
        </div>

        {/* POP-UP VICTOIRE */}
        {showWinnerModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#14161F] border-2 border-amber-400 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-6 relative shadow-[0_0_50px_rgba(245,158,11,0.5)]">
              <button 
                onClick={() => setShowWinnerModal(false)}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="bg-amber-500/10 border-2 border-amber-400 p-6 rounded-3xl space-y-4 shadow-xl">
                <Gift className="w-14 h-14 text-amber-400 mx-auto animate-bounce" />
                
                <div className="space-y-2">
                  <p className="text-sm font-black text-amber-300 uppercase tracking-wider">{t.spinCongratsTitle}</p>
                  <h3 className="text-3xl sm:text-4xl font-black text-amber-400 drop-shadow-md">
                    {restaurantData.reward_offer}
                  </h3>
                </div>

                <p className="text-sm sm:text-base text-zinc-200 font-bold leading-relaxed">
                  {t.spinCongratsDesc}
                </p>

                <a 
                  href={restaurantData.linked_evolution ? `https://wa.me/${restaurantData.linked_evolution}` : "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 font-black text-base sm:text-lg py-4 px-6 rounded-2xl transition shadow-[0_0_25px_rgba(16,185,129,0.4)] flex items-center justify-center gap-3 transform active:scale-95 border border-emerald-300/40"
                >
                  <Mic className="w-6 h-6 text-zinc-950 shrink-0" />
                  <span>{t.sendReviewWhatsapp}</span>
                </a>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10 text-xs font-black text-zinc-200">
                  <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">{t.step1}</div>
                  <div className="bg-zinc-950 p-2.5 rounded-xl border border-amber-500/30 text-amber-400">{t.step2}</div>
                  <div className="bg-zinc-950 p-2.5 rounded-xl border border-emerald-500/30 text-emerald-400">{t.step3}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL WIFI */}
        {activeModal === 'wifi' && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#14161F] border-2 border-amber-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 relative shadow-2xl">
              <button 
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-1 pt-2">
                <Wifi className="w-10 h-10 text-blue-400 mx-auto" />
                <h3 className="text-xl font-black text-white">{t.wifiCardTitle}</h3>
              </div>

              {!wifiSuccess ? (
                <form onSubmit={handleWifiSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-400">{t.wifiInputLabel}</label>
                    <input 
                      type="tel"
                      required
                      dir="ltr"
                      placeholder="966 50 000 0000"
                      value={wifiPhone}
                      onChange={(e) => setWifiPhone(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={wifiLoading}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-xs py-3.5 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    {wifiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : t.wifiBtnSubmit}
                  </button>
                </form>
              ) : (
                <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-2xl text-center space-y-2">
                  <p className="text-xs font-bold text-zinc-300">{t.wifiPassSuccess}</p>
                  <p className="text-2xl font-mono font-black text-amber-400 tracking-wider">
                    {restaurantData.wifi_password}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL IA FITNESS */}
        {activeModal === 'food_ai' && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#14161F] border-2 border-emerald-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 relative shadow-2xl my-auto">
              <button 
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
        
              <div className="text-center space-y-1 pt-2">
                <HeartPulse className="w-10 h-10 text-emerald-400 mx-auto animate-pulse" />
                <h3 className="text-xl font-black text-white">{t.aiCardTitle}</h3>
              </div>
        
              {!aiResult ? (
                <div className="space-y-3 text-start">
                  
                  {/* 1. WHATSAPP */}
                  <div>
                    <label className="text-xs font-bold text-zinc-300">
                      {lang === 'ar' ? 'رقم الواتساب الخاص بك :' : lang === 'fr' ? 'Votre numéro WhatsApp :' : 'Your WhatsApp Number:'}
                    </label>
                    <input 
                      type="tel"
                      required
                      dir="ltr"
                      placeholder="966500000000"
                      value={clientPhone}
                      onChange={(e) => {
                        const val = e.target.value;
                        setClientPhone(val);
                        localStorage.setItem('user_phone', val);
                      }}
                      className="w-full bg-zinc-950 border border-emerald-500/40 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-400 mt-1"
                    />
                  </div>
        
                  {/* 2. EMAIL */}
                  <div>
                    <label className="text-xs font-bold text-zinc-300">
                      {lang === 'ar' ? 'البريد الإلكتروني (لاستلام التقرير) :' : lang === 'fr' ? 'Votre e-mail (pour le bilan) :' : 'Your Email:'}
                    </label>
                    <input 
                      type="email"
                      required
                      dir="ltr"
                      placeholder="nom@exemple.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full bg-zinc-950 border border-emerald-500/40 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-400 mt-1"
                    />
                  </div>
        
                  {/* 3. NIVEAU FITNESS */}
                  <div>
                    <label className="text-xs font-bold text-zinc-300">
                      {lang === 'ar' ? 'مستوى اللياقة البدنية :' : lang === 'fr' ? 'Niveau de Fitness :' : 'Fitness Level:'}
                    </label>
                    <div className="grid grid-cols-3 gap-2 mt-1 text-xs font-bold">
                      <button 
                        type="button" 
                        onClick={() => setFitnessLevel('beginner')} 
                        className={`p-2 rounded-xl border transition ${fitnessLevel === 'beginner' ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}
                      >
                        🟢 {lang === 'ar' ? 'مبتدئ' : lang === 'fr' ? 'Débutant' : 'Beginner'}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setFitnessLevel('intermediate')} 
                        className={`p-2 rounded-xl border transition ${fitnessLevel === 'intermediate' ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}
                      >
                        🟡 {lang === 'ar' ? 'متوسط' : lang === 'fr' ? 'Intermédiaire' : 'Intermediate'}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setFitnessLevel('advanced')} 
                        className={`p-2 rounded-xl border transition ${fitnessLevel === 'advanced' ? 'bg-rose-500/20 border-rose-400 text-rose-300' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}
                      >
                        🔴 {lang === 'ar' ? 'متقدم' : lang === 'fr' ? 'Confirmé' : 'Advanced'}
                      </button>
                    </div>
                  </div>
        
                  {/* 4. REMARQUES / REGIME */}
                  <div>
                    <label className="text-xs font-bold text-zinc-300">
                      {lang === 'ar' ? 'ملاحظات / مكونات إضافية (اختياري) :' : lang === 'fr' ? 'Remarques / Ingrédients (optionnel) :' : 'Notes / Ingredients (optional):'}
                    </label>
                    <input 
                      type="text" 
                      placeholder={lang === 'fr' ? 'Ex: sans sucre, lait d\'avoine...' : 'e.g. sugar-free, oat milk...'} 
                      value={userNotes} 
                      onChange={(e) => setUserNotes(e.target.value)} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400 mt-1" 
                    />
                  </div>
        
                  {/* 5. PHOTO */}
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-300 font-bold text-center">{t.aiUploadInstruction}</p>
                    <label className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-zinc-950/80 p-4 rounded-2xl text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition">
                      {selectedImage ? (
                        <img src={selectedImage} alt="Plat" className="w-full h-28 object-cover rounded-xl border border-emerald-500/30" />
                      ) : (
                        <>
                          <Camera className="w-8 h-8 text-emerald-400" />
                          <span className="text-xs font-bold text-zinc-300">Prendre / Choisir une photo</span>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        onChange={handleImageUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>
        
                  {/* 6. BOUTON D'ENVOI */}
                  <button 
                    type="button" 
                    onClick={analyzeFoodImage} 
                    disabled={aiAnalysisLoading || !selectedImage} 
                    className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-zinc-950 font-black text-xs py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg"
                  >
                    {aiAnalysisLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{t.aiAnalyzing}</span>
                      </>
                    ) : (
                      <span>{lang === 'fr' ? 'Lancer l\'analyse du plat 🚀' : lang === 'ar' ? 'بدء تحليل الطبق 🚀' : 'Start Meal Analysis 🚀'}</span>
                    )}
                  </button>
        
                </div>
              ) : (
            
               {/* RÉSULTAT AFFICHE DANS LA POPUP */}
              <div className="space-y-4 text-start">

                {/* CARD PLAT & CALORIES */}
                <div className="bg-zinc-950 p-4 rounded-2xl border border-emerald-500/30 space-y-2 text-center">
                  <p className="text-base font-black text-white">
                    🍽️ {lang === 'ar' 
                      ? (aiResult?.dish_name_ar || aiResult?.dish_name_fr) 
                      : (aiResult?.dish_name_fr || aiResult?.dish_name_en || aiResult?.dish_name_ar || 'Votre plat')}
                  </p>
                  <div className="inline-block bg-amber-500/20 text-amber-400 text-sm font-black px-4 py-1.5 rounded-xl border border-amber-500/30">
                    ~{aiResult?.estimated_calories || aiResult?.calories || aiResult?.kcal || 0} kcal
                  </div>
                </div>

                {/* BANNIÈRE DE CONFIRMATION EMAIL & WHATSAPP (VIP & ULTRA VISIBLE) */}
                <div className="bg-emerald-500/15 border-2 border-emerald-500/40 p-4 rounded-2xl text-center space-y-1.5 shadow-lg shadow-emerald-500/10">
                  <div className="text-emerald-400 font-black text-sm md:text-base flex items-center justify-center gap-2">
                    <span className="text-lg">✅</span>
                    <span>
                      {lang === 'en'
                        ? 'Full Report & Workout Sent!'
                        : lang === 'ar'
                        ? 'تم إرسال التقرير والحصة بنجاح!'
                        : 'Bilan & séance envoyés avec succès !'}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-emerald-200/90 leading-relaxed">
                    {lang === 'en'
                      ? 'Check your Email inbox (and Spam folder) & WhatsApp.'
                      : lang === 'ar'
                      ? 'تفقد بريدك الإلكتروني (ومجلد Spams) والواتساب.'
                      : 'Consultez votre boîte e-mail (pensez aux spams !) et votre WhatsApp.'}
                  </p>
                </div>

                {/* BOUTON RECOMMENCER */}
                <button 
                  onClick={() => { setAiResult(null); setSelectedImage(null); }} 
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs py-3.5 rounded-xl transition"
                >
                  📸 {lang === 'en' ? 'Analyze another meal' : lang === 'ar' ? 'تحليل وجبة أخرى' : 'Analyser un autre plat'}
                </button>

              </div>
              )}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <footer className="pt-2 text-center">
          <p className="text-xs text-zinc-500 font-bold tracking-wider flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            {t.poweredBy}
          </p>
        </footer>

      </div>
    </div>
  );
}
