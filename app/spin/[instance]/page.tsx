'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { 
  Sparkles, Wifi, Utensils, Camera, Flame, Activity, ShieldCheck, 
  Globe, Award, Check, X, RefreshCw, Dices, Trophy, HeartPulse, Gift, Play
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

  // Auto-détection de la langue du téléphone
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userLang = (navigator.language || (navigator as any).userLanguage || 'ar').toLowerCase();
      if (userLang.startsWith('fr')) setLang('fr');
      else if (userLang.startsWith('en')) setLang('en');
      else setLang('ar');
    }
  }, []);

  // Extraction garantie de l'instance depuis l'URL
  let currentInstance = "";
  if (typeof window !== 'undefined') {
    const parts = window.location.pathname.split('/spin/');
    if (parts.length > 1) {
      currentInstance = parts[1].split('/')[0].split('?')[0].trim().toLowerCase();
    }
  }
  if (!currentInstance) {
    currentInstance = (typeof params?.instance === 'string' ? params.instance : searchParams.get('instance') || "halim_cafe_madinah").trim().toLowerCase();
  }

  const [restaurantData, setRestaurantData] = useState<any>({
    restaurant_name: "Halim Cafe",
    city: "المدينة المنورة",
    reward_offer: "1 hot drink",
    wifi_password: "halim2030",
    menu_url: "#",
    google_review_link: "https://search.google.com/local/writereview?placeid=12345",
    linked_evolution: "966530629832"
  });

  // Modals States
  const [activeModal, setActiveModal] = useState<'wifi' | 'food_ai' | 'spin' | null>(null);

  // Spin Wheel State
  const [mustSpin, setMustSpin] = useState(false);
  const [rotationDegree, setRotationDegree] = useState(0);
  const [wonPrize, setWonPrize] = useState<string | null>(null);

  // WiFi Lead Form
  const [wifiPhone, setWifiPhone] = useState('');
  const [wifiLoading, setWifiLoading] = useState(false);
  const [wifiSuccess, setWifiSuccess] = useState(false);

  // AI Food Vision Form
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  // Charger les données du restaurant depuis NocoDB
  useEffect(() => {
    const loadRestaurant = async () => {
      setLoadingRest(true);
      try {
        const res = await fetch(`${N8N_RESTAURANTS_API}?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.list || []);
          const matched = list.find((r: any) => {
            const inst = parseInstanceName(r.instance_name).toLowerCase();
            return inst === currentInstance || inst.includes(currentInstance) || currentInstance.includes(inst);
          });

          if (matched) {
            setRestaurantData({
              restaurant_name: matched.restaurant_name || "Halim Cafe",
              city: matched.city || "المدينة المنورة",
              reward_offer: matched.reward_offer || matched.loyalty_reward || "1 hot drink",
              wifi_password: matched.wifi_password || "halim2030",
              menu_url: matched.menu_url || "#",
              google_review_link: matched.google_review_link || "#",
              linked_evolution: matched.linked_evolution || "966530629832"
            });
          }
        }
      } catch (e) {
        console.error("Erreur chargement restaurant:", e);
      } finally {
        setLoadingRest(false);
      }
    };

    if (currentInstance) {
      loadRestaurant();
    }
  }, [currentInstance]);

  // ANIMATION DE LA ROUE DE LA FORTUNE
  const handleSpinWheel = () => {
    if (mustSpin) return;
    setMustSpin(true);
    setWonPrize(null);

    // Animation 3D de 5 tours + arrêt sur le segment gagnant
    const fullRotations = 360 * 6;
    const randomAngle = 30 + Math.floor(Math.random() * 300);
    const finalDegree = rotationDegree + fullRotations + randomAngle;

    setRotationDegree(finalDegree);

    setTimeout(() => {
      setMustSpin(false);
      setWonPrize(restaurantData.reward_offer || "1 hot drink");
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
          language: lang,
          instance: currentInstance
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAiResult(data);
      } else {
        setAiResult({
          dish_name_fr: "Boisson Chaude Halim VIP",
          dish_name_ar: "مشروب حليم دافئ فاخر",
          estimated_calories: 220,
          health_status: "Délicieux ☕",
          macronutrients: { carbs: "28g", protein: "4g", fat: "8g" },
          workout: {
            duration_minutes: 10,
            title_fr: "Séance Brûle-Calories Halim Express",
            title_ar: "حصة حرق سعرات سريعة",
            exercises: [
              { name_fr: "Jumping Jacks", name_ar: "قفز مع فتح الرجلين", duration: "45 sec" },
              { name_fr: "Squats au poids du corps", name_ar: "تمارين السكوات", duration: "45 sec" }
            ]
          }
        });
      }
    } catch (err) {
      setAiResult({
        dish_name_fr: "Boisson Chaude Halim VIP",
        dish_name_ar: "مشروب حليم دافئ فاخر",
        estimated_calories: 220,
        health_status: "Délicieux ☕",
        macronutrients: { carbs: "28g", protein: "4g", fat: "8g" },
        workout: {
          duration_minutes: 10,
          title_fr: "Séance Brûle-Calories Halim Express",
          title_ar: "حصة حرق سعرات سريعة",
          exercises: [
            { name_fr: "Jumping Jacks", name_ar: "قفز مع فتح الرجلين", duration: "45 sec" },
            { name_fr: "Squats au poids du corps", name_ar: "تمارين السكوات", duration: "45 sec" }
          ]
        }
      });
    } finally {
      setAiAnalysisLoading(false);
    }
  };

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
      btnSpin: "جرب حظك الآن 🎲",
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
      spinCongrats: "🎉 مبروك! لقد كسبت :",
      sendReviewWhatsapp: "إرسال التقييم الصوتي عبر واتساب 💬",
      poweredBy: "Smart Review AI v4.0 • Saudi F&B Vision 2030"
    },
    fr: {
      portalTitle: "PORTAIL DE GASTRONOMIE VIP",
      subTitle: "Bienvenue chez",
      spinCardTitle: "Roue de la Fortune & Cadeaux",
      spinCardDesc: "Tournez la roue et gagnez un cadeau VIP en laissant votre avis",
      aiCardTitle: "Coach IA Nutrition & Fitness Pass",
      aiCardDesc: "Scannez votre plat pour évaluer les calories & la séance fitness 12 min",
      wifiCardTitle: "Accès WiFi Haut Débit",
      wifiCardDesc: "Obtenez le mot de passe WiFi instantanément",
      menuCardTitle: "Menu & Carte du Restaurant",
      menuCardDesc: "Découvrez nos spécialités et boissons",
      btnSpin: "Lancer la Roue VIP 🎲",
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
      spinCongrats: "🎉 FÉLICITATIONS ! Vous avez gagné :",
      sendReviewWhatsapp: "Envoyer mon avis vocal sur WhatsApp 💬",
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
      spinCongrats: "🎉 CONGRATULATIONS! You won:",
      sendReviewWhatsapp: "Send Voice Review on WhatsApp 💬",
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
        
        {/* HEADER DE LA PAGE */}
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

        {/* HERO BANNER RESTAURANT */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 via-amber-300 to-emerald-500 rounded-[28px] blur-sm opacity-70"></div>
          <div className="relative bg-[#14161F] border-2 border-amber-400/40 rounded-[26px] p-6 text-center space-y-2 shadow-2xl">
            <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">{t.subTitle}</p>
            <h1 className="text-3xl font-black text-white">{restaurantData.restaurant_name}</h1>
            <p className="text-xs text-zinc-400 font-bold">{restaurantData.city}</p>
          </div>
        </div>

        {/* GRILLE DES 4 PILIERS DU SAAS V4 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* PILIER 1 : ROUE DE LA FORTUNE */}
          <div className="bg-[#14161F] border border-amber-500/30 p-5 rounded-2xl space-y-3 hover:border-amber-400 transition-all">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
                <Trophy className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                VIP
              </span>
            </div>
            <div>
              <h3 className="text-base font-black text-white">{t.spinCardTitle}</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-snug">{t.spinCardDesc}</p>
            </div>
            <button 
              onClick={() => setActiveModal('spin')}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 font-black text-xs py-3 rounded-xl hover:opacity-90 transition shadow-lg flex items-center justify-center gap-1.5"
            >
              <Dices className="w-4 h-4" />
              {t.btnSpin}
            </button>
          </div>

          {/* PILIER 2 : IA NUTRITION & FITNESS */}
          <div className="bg-[#14161F] border border-emerald-500/40 p-5 rounded-2xl space-y-3 hover:border-emerald-400 transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-500 text-zinc-950 font-black text-[9px] px-2 py-0.5 rounded-bl">
              v4.0 NEW
            </div>
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl">
                <HeartPulse className="w-6 h-6" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-black text-white">{t.aiCardTitle}</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-snug">{t.aiCardDesc}</p>
            </div>
            <button 
              onClick={() => setActiveModal('food_ai')}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-zinc-950 font-black text-xs py-3 rounded-xl hover:opacity-90 transition shadow-lg flex items-center justify-center gap-1.5"
            >
              <Camera className="w-4 h-4" />
              {t.btnAi}
            </button>
          </div>

          {/* PILIER 3 : CODE WIFI */}
          <div className="bg-[#14161F] border border-white/10 p-5 rounded-2xl space-y-3 hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-xl">
                <Wifi className="w-6 h-6" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-black text-white">{t.wifiCardTitle}</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-snug">{t.wifiCardDesc}</p>
            </div>
            <button 
              onClick={() => setActiveModal('wifi')}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-black text-xs py-3 rounded-xl transition border border-white/10 flex items-center justify-center gap-1.5"
            >
              <Wifi className="w-4 h-4 text-blue-400" />
              {t.btnWifi}
            </button>
          </div>

          {/* PILIER 4 : MENU DIGITAL */}
          <div className="bg-[#14161F] border border-white/10 p-5 rounded-2xl space-y-3 hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-xl">
                <Utensils className="w-6 h-6" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-black text-white">{t.menuCardTitle}</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-snug">{t.menuCardDesc}</p>
            </div>
            <a 
              href={restaurantData.menu_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-black text-xs py-3 rounded-xl transition border border-white/10 flex items-center justify-center gap-1.5"
            >
              <Utensils className="w-4 h-4 text-purple-400" />
              {t.btnMenu}
            </a>
          </div>

        </div>

        {/* MODAL 1 : ACCÈS WIFI */}
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

        {/* MODAL 2 : IA NUTRITION & FITNESS COACH */}
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
                        <div className="bg-zinc-900 p-2 rounded-xl">Glucides: {aiResult.macronutrients.carbs}</div>
                        <div className="bg-zinc-900 p-2 rounded-xl">Protéines: {aiResult.macronutrients.protein}</div>
                        <div className="bg-zinc-900 p-2 rounded-xl">Lipides: {aiResult.macronutrients.fat}</div>
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

        {/* MODAL 3 : ROUE DE LA FORTUNE 3D INTERACTIVE */}
        {activeModal === 'spin' && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#14161F] border-2 border-amber-500/40 rounded-3xl p-6 max-w-md w-full text-center space-y-5 relative shadow-2xl">
              <button 
                onClick={() => { setActiveModal(null); setWonPrize(null); }}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <Trophy className="w-9 h-9 text-amber-400 mx-auto" />
                <h3 className="text-xl font-black text-white">{t.spinCardTitle}</h3>
              </div>

              {!wonPrize ? (
                <div className="space-y-5">
                  {/* ROUE ANIMÉE SVG 3D */}
                  <div className="relative w-56 h-56 mx-auto my-2">
                    {/* FLÈCHE POINTEUR */}
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20 text-amber-400 drop-shadow-md">
                      ▼
                    </div>
                    
                    <div 
                      className="w-full h-full rounded-full border-4 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.5)] overflow-hidden transition-all duration-[4500ms] cubic-bezier(0.15,0.9,0.2,1)"
                      style={{ transform: `rotate(${rotationDegree}deg)` }}
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
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 font-black text-sm py-3.5 rounded-xl transition shadow-lg flex items-center justify-center gap-2"
                  >
                    {mustSpin ? <RefreshCw className="w-5 h-5 animate-spin" /> : t.spinBtnAction}
                  </button>
                </div>
              ) : (
                /* POPUP DE VICTOIRE AVEC BOUTON WHATSAPP */
                <div className="bg-amber-500/10 border-2 border-amber-400 p-5 rounded-2xl space-y-3 animate-pulse">
                  <Gift className="w-10 h-10 text-amber-400 mx-auto" />
                  <p className="text-xs font-bold text-amber-300">{t.spinCongrats}</p>
                  <h4 className="text-2xl font-black text-white">{wonPrize}</h4>
                  
                  <a 
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black text-xs py-3.5 rounded-xl transition shadow-lg mt-2"
                  >
                    {t.sendReviewWhatsapp}
                  </a>
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
