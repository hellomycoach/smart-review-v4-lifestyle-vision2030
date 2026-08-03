'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { 
  Sparkles, Wifi, Utensils, Camera, Flame, Activity, ShieldCheck, 
  Globe, Award, Check, X, RefreshCw, Trophy, HeartPulse, Gift, Mic, AlertCircle
} from 'lucide-react';

const N8N_RESTAURANTS_API = "https://n8n.srv821341.hstgr.cloud/webhook/get-restaurants-v3";
const N8N_WIFI_LEADS_API = "https://n8n.srv821341.hstgr.cloud/webhook/save-wifi-lead-v2";
const N8N_AI_FOOD_VISION_API = "https://n8n.srv821341.hstgr.cloud/webhook/ai-food-vision-v4";

const parseInstanceName = (raw: any): string => {
  if (!raw) return "";
  if (typeof raw === 'string') return raw.trim();
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    if (typeof first === 'string') return first.trim();
    if (typeof first === 'object' && first !== null) {
      return (first.instance_name || first.restaurant_name || "").trim();
    }
  }
  return "";
};

export default function LuxuryRestaurantPortalV4() {
  const params = useParams();
  const searchParams = useSearchParams();

  const [lang, setLang] = useState<'ar' | 'fr' | 'en'>('ar');
  const [loadingRest, setLoadingRest] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Auto-détection de la langue du téléphone
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userLang = (navigator.language || (navigator as any).userLanguage || 'ar').toLowerCase();
      if (userLang.startsWith('fr')) setLang('fr');
      else if (userLang.startsWith('en')) setLang('en');
      else setLang('ar');
    }
  }, []);

  // Extraction STRICTEMENT dynamique de l'instance
  let currentInstance = "";
  if (typeof window !== 'undefined') {
    const parts = window.location.pathname.split('/spin/');
    if (parts.length > 1) {
      currentInstance = parts[1].split('/')[0].split('?')[0].trim().toLowerCase();
    }
  }
  if (!currentInstance && params?.instance) {
    currentInstance = (typeof params.instance === 'string' ? params.instance : '').trim().toLowerCase();
  }
  if (!currentInstance && searchParams.get('instance')) {
    currentInstance = (searchParams.get('instance') || '').trim().toLowerCase();
  }

  // STATE INITIAL NEUTRE (ZÉRO DONNÉE HARDCODÉE)
  const [restaurantData, setRestaurantData] = useState<any>({
    restaurant_name: "",
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

  // CHARGEMENT SÉCURISÉ MULTI-TENANT
  useEffect(() => {
    const loadRestaurant = async () => {
      // SÉCURITÉ 1 : Si aucune instance dans l'URL, afficher Erreur Neutre (Pas de fallback concurrent)
      if (!currentInstance) {
        setLoadingRest(false);
        setNotFound(true);
        return;
      }

      setLoadingRest(true);
      setNotFound(false);

      try {
        const res = await fetch(`${N8N_RESTAURANTS_API}?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.list || []);
          const target = currentInstance.toLowerCase().trim();

          // SÉCURITÉ 2 : Recherche stricte en 2 passes
          // Passe A : Correspondance exacte
          let matched = list.find((r: any) => parseInstanceName(r.instance_name).toLowerCase().trim() === target);

          // Passe B : Correspondance partielle seulement si au moins 3 caractères
          if (!matched && target.length >= 3) {
            matched = list.find((r: any) => {
              const inst = parseInstanceName(r.instance_name).toLowerCase().trim();
              return inst.length > 0 && (inst.includes(target) || target.includes(inst));
            });
          }

          // SÉCURITÉ 3 : Si trouvé, affectation dynamique. Sinon, écran Neutre Not Found.
          if (matched) {
            const botPhone = (matched.linked_evolution || matched.manager_whatsapp || "").toString().replace(/[^0-9]/g, '');

            setRestaurantData({
              restaurant_name: matched.restaurant_name || "",
              city: matched.city || "",
              reward_offer: matched.reward_offer || matched.loyalty_reward || "",
              wifi_password: matched.wifi_password || "",
              menu_url: matched.menu_url || "#",
              linked_evolution: botPhone
            });
          } else {
            setNotFound(true);
          }
        } else {
          setNotFound(true);
        }
      } catch (e) {
        console.error("Erreur chargement restaurant:", e);
        setNotFound(true);
      } finally {
        setLoadingRest(false);
      }
    };

    loadRestaurant();
  }, [currentInstance]);

  // ANIMATION ROTATION ROUE V3 (4.5s FLUIDE)
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
    }, 4500);
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
          instance_name: currentInstance,
          source: 'WiFi Portal V4'
        })
      });
      setWifiSuccess(true);
    } catch (e) {
      setWifiSuccess(true);
    } finally {
      setWifiLoading(false);
    }
  };

  // Traitement Image IA Vision
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSelectedImage(base64String);
        analyzeFoodImage(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeFoodImage = async (base64Image: string) => {
    setAiAnalysisLoading(true);
    setAiResult(null);

    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

    try {
      const res = await fetch(N8N_AI_FOOD_VISION_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: cleanBase64,
          data: cleanBase64,
          client_email: clientEmail.trim(),
          language: lang,
          instance: currentInstance
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAiResult(data);
      }
    } catch (err) {
      console.error("Erreur analyse IA:", err);
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  // URL WHATSAPP DYNAMIQUE DU BOT RESTAURANT
  const whatsappUrl = `https://wa.me/${restaurantData.linked_evolution}?text=${encodeURIComponent('مرحباً، أود إرسال تقييمي للحصول على الهديّة!')}`;

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
      spinCongratsDesc: "سجل ملاحظة صوتية مدتها 5 ثوانٍ على واتساب لاستلام هديتك فوراً في الكاشير!",
      sendReviewWhatsapp: "إرسال التقييم الصوتي عبر واتساب 💬",
      step1: "1. انقر للفتح",
      step2: "2. سجل فويس 5s 🎙️",
      step3: "3. استلم هديتك 🎁",
      notFoundTitle: "المطعم غير موجود",
      notFoundDesc: "يرجى التأكد من مسح الرمز الضوئي (QR Code) الخاص بالمطعم الصحيح.",
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
      spinCongratsDesc: "Enregistrez une note vocale de 5s sur WhatsApp pour recevoir votre cadeau immédiatement en caisse !",
      sendReviewWhatsapp: "Envoyer mon avis vocal sur WhatsApp 💬",
      step1: "1. Ouvrir WhatsApp",
      step2: "2. Vocal de 5s 🎙️",
      step3: "3. Votre Cadeau 🎁",
      notFoundTitle: "Établissement Non Trouvé",
      notFoundDesc: "Veuillez vérifier l'URL ou scanner le QR Code officiel de l'établissement.",
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
      spinCongratsDesc: "Record a 5-second voice review on WhatsApp to claim your reward at the cashier!",
      sendReviewWhatsapp: "Send Voice Review on WhatsApp 💬",
      step1: "1. Tap to open",
      step2: "2. Record 5s voice 🎙️",
      step3: "3. Claim reward 🎁",
      notFoundTitle: "Restaurant Not Found",
      notFoundDesc: "Please check the URL or scan the official restaurant QR Code.",
      loadingText: "Loading VIP Portal...",
      poweredBy: "Smart Review AI v4.0 • Saudi F&B Vision 2030"
    }
  }[lang];

  const toggleLanguage = () => {
    if (lang === 'ar') setLang('fr');
    else if (lang === 'fr') setLang('en');
    else setLang('ar');
  };

  // 1. ÉCRAN DE CHARGEMENT SOMBRE NEUTRE
  if (loadingRest) {
    return (
      <div className="min-h-screen bg-[#090A0F] text-zinc-100 font-['Cairo',sans-serif] flex flex-col items-center justify-center p-6 space-y-4">
        <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
        <p className="text-xs font-bold text-zinc-400 animate-pulse">{t.loadingText}</p>
      </div>
    );
  }

  // 2. ÉCRAN NEUTRE NOT FOUND (SI L'INSTANCE N'EXISTE PAS)
  if (notFound || !restaurantData.restaurant_name) {
    return (
      <div className="min-h-screen bg-[#090A0F] text-zinc-100 font-['Cairo',sans-serif] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-black text-white">{t.notFoundTitle}</h2>
        <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">{t.notFoundDesc}</p>
      </div>
    );
  }

  // 3. ÉCRAN OFFICIEL DU RESTAURANT MATCHÉ DYNAMIQUEMENT
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
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">
              {t.portalTitle}
            </span>
          </div>

          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-amber-500/20 text-xs font-black text-zinc-200 hover:text-amber-400 backdrop-blur-xl transition-all"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            {lang === 'ar' ? 'Français' : lang === 'fr' ? 'English' : 'العربية'}
          </button>
        </header>

        {/* HERO BANNER RESTAURANT DYNAMIQUE */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 via-amber-300 to-emerald-500 rounded-[28px] blur-sm opacity-70"></div>
          <div className="relative bg-[#14161F] border-2 border-amber-400/40 rounded-[26px] p-6 text-center space-y-2 shadow-2xl">
            <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">{t.subTitle}</p>
            <h1 className="text-3xl font-black text-white">{restaurantData.restaurant_name}</h1>
            {restaurantData.city && <p className="text-xs text-zinc-400 font-bold">{restaurantData.city}</p>}
          </div>
        </div>

        {/* ROUE DE LA FORTUNE 3D (AVEC ANIMATION 4.5S) */}
        <div className="bg-[#14161F] border-2 border-amber-500/40 p-6 rounded-[26px] text-center space-y-5 shadow-2xl relative overflow-hidden">
          
          <div className="space-y-1">
            <div className="inline-flex p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl mb-1">
              <Trophy className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-white">{t.spinCardTitle}</h2>
            <p className="text-xs text-zinc-400 font-bold leading-relaxed">{t.spinCardDesc}</p>
          </div>

          <div className="relative w-60 h-60 mx-auto my-2">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20 text-amber-400 text-xl drop-shadow-md">
              ▼
            </div>
            
            <div 
              className="w-full h-full rounded-full border-4 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.5)] overflow-hidden"
              style={{ 
                transform: `rotate(${rotationDegree}deg)`,
                transition: mustSpin ? 'transform 4.5s cubic-bezier(0.15, 0.9, 0.2, 1)' : 'none'
              }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <g transform="translate(50,50)">
                  <path d="M0,0 L50,0 A50,50 0 0,1 25,43.3 Z" fill="#D4AF37" />
                  <path d="M0,0 L25,43.3 A50,50 0 0,1 -25,43.3 Z" fill="#14161F" />
                  <path d="M0,0 L-25,43.3 A50,50 0 0,1 -50,0 Z" fill="#10B981" />
                  <path d="M0,0 L-50,0 A50,50 0 0,1 -25,-43.3 Z" fill="#D4AF37" />
                  <path d="M0,0 L-25,-43.3 A50,50 0 0,1 25,-43.3 Z" fill="#14161F" />
                  <path d="M0,0 L25,-43.3 A50,50 0 0,1 50,0 Z" fill="#10B981" />
                </g>
              </svg>
            </div>
          </div>

          <button 
            onClick={handleSpinWheel}
            disabled={mustSpin}
            className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-zinc-950 font-black text-sm py-4 rounded-xl transition shadow-xl hover:opacity-95 active:scale-95 flex items-center justify-center gap-2"
          >
            {mustSpin ? <RefreshCw className="w-5 h-5 animate-spin" /> : t.spinBtnAction}
          </button>
        </div>

        {/* MODULES V4 : IA FITNESS, WIFI, MENU */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          <button 
            onClick={() => setActiveModal('food_ai')}
            className="bg-[#14161F] border border-emerald-500/40 p-4 rounded-2xl space-y-2 hover:border-emerald-400 transition text-start relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <HeartPulse className="w-6 h-6 text-emerald-400" />
              <span className="text-[9px] font-black bg-emerald-500 text-zinc-950 px-1.5 py-0.5 rounded">v4.0</span>
            </div>
            <div>
              <h3 className="text-xs font-black text-white">{t.aiCardTitle}</h3>
              <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">{t.aiCardDesc}</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveModal('wifi')}
            className="bg-[#14161F] border border-white/10 p-4 rounded-2xl space-y-2 hover:border-white/20 transition text-start"
          >
            <Wifi className="w-6 h-6 text-blue-400" />
            <div>
              <h3 className="text-xs font-black text-white">{t.wifiCardTitle}</h3>
              <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">{t.wifiCardDesc}</p>
            </div>
          </button>

          <a 
            href={restaurantData.menu_url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#14161F] border border-white/10 p-4 rounded-2xl space-y-2 hover:border-white/20 transition text-start block"
          >
            <Utensils className="w-6 h-6 text-purple-400" />
            <div>
              <h3 className="text-xs font-black text-white">{t.menuCardTitle}</h3>
              <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">{t.menuCardDesc}</p>
            </div>
          </a>

        </div>

        {/* POP-UP VICTOIRE */}
        {showWinnerModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#14161F] border-2 border-amber-400 rounded-3xl p-6 max-w-md w-full text-center space-y-5 relative shadow-[0_0_50px_rgba(245,158,11,0.5)]">
              <button 
                onClick={() => setShowWinnerModal(false)}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <Gift className="w-12 h-12 text-amber-400 mx-auto animate-bounce" />
              
              <div className="space-y-1">
                <p className="text-xs font-bold text-amber-300">{t.spinCongratsTitle}</p>
                <h3 className="text-2xl font-black text-white">{restaurantData.reward_offer}</h3>
              </div>

              <p className="text-xs text-zinc-300 font-bold leading-relaxed">
                {t.spinCongratsDesc}
              </p>

              {restaurantData.linked_evolution && (
                <a 
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black text-sm py-4 rounded-2xl transition shadow-lg flex items-center justify-center gap-2 transform active:scale-95"
                >
                  <Mic className="w-5 h-5 text-zinc-950" />
                  <span>{t.sendReviewWhatsapp}</span>
                </a>
              )}

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-[10px] font-black text-zinc-300">
                <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800">{t.step1}</div>
                <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800 text-amber-400">{t.step2}</div>
                <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800 text-emerald-400">{t.step3}</div>
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
            <div className="bg-[#14161F] border-2 border-emerald-500/40 rounded-3xl p-6 max-w-md w-full space-y-5 relative shadow-2xl my-auto">
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
                <div className="space-y-4">
                  <p className="text-xs text-zinc-300 font-bold text-center">{t.aiUploadInstruction}</p>
                  
                  <label className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-zinc-950/80 p-8 rounded-2xl text-center flex flex-col items-center justify-center gap-3 cursor-pointer transition">
                    <Camera className="w-10 h-10 text-emerald-400" />
                    <span className="text-xs font-bold text-zinc-300">
                      {selectedImage ? "Changer la photo" : "Prendre / Choisir une photo"}
                    </span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      onChange={handleImageUpload} 
                      className="hidden" 
                    />
                  </label>

                  {aiAnalysisLoading && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-2">
                      <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
                      <p className="text-xs font-bold text-emerald-300">{t.aiAnalyzing}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 text-start">
                  <div className="bg-zinc-950 p-4 rounded-2xl border border-emerald-500/30 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black text-white">
                        {lang === 'ar' ? aiResult.dish_name_ar : aiResult.dish_name_fr || aiResult.dish_name_en}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {aiResult.health_status || "IA Verified"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Flame className="w-5 h-5 text-orange-500 shrink-0" />
                      <span className="text-xs font-bold text-zinc-300">{t.calories}</span>
                      <span className="text-base font-black text-orange-400 font-mono">
                        ~{aiResult.estimated_calories} kcal
                      </span>
                    </div>

                    {aiResult.macronutrients && (
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800 text-center text-[10px] font-bold">
                        <div className="bg-zinc-900 p-2 rounded-xl">Glucides: {aiResult.macronutrients.carbs || "-"}</div>
                        <div className="bg-zinc-900 p-2 rounded-xl">Protéines: {aiResult.macronutrients.protein || "-"}</div>
                        <div className="bg-zinc-900 p-2 rounded-xl">Lipides: {aiResult.macronutrients.fat || "-"}</div>
                      </div>
                    )}
                  </div>

                  {aiResult.workout && (
                    <div className="bg-gradient-to-br from-emerald-950/60 to-zinc-950 p-4 rounded-2xl border border-emerald-500/40 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-black text-emerald-400">
                        <Activity className="w-4 h-4" />
                        <span>{t.workoutTitle}</span>
                      </div>

                      <div className="space-y-2">
                        {aiResult.workout.exercises?.map((ex: any, idx: number) => (
                          <div key={idx} className="bg-zinc-900/90 p-2.5 rounded-xl flex items-center justify-between text-xs">
                            <span className="font-bold text-white">
                              {lang === 'ar' ? ex.name_ar : ex.name_fr || ex.name_en}
                            </span>
                            <span className="font-mono text-emerald-400 font-black px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                              {ex.duration}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={() => { setAiResult(null); setSelectedImage(null); }}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-black text-xs py-3 rounded-xl transition"
                  >
                    Analyser un autre plat 📸
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <footer className="pt-2 text-center">
          <p className="text-[11px] text-zinc-500 font-bold tracking-wider flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            {t.poweredBy}
          </p>
        </footer>

      </div>
    </div>
  );
}
