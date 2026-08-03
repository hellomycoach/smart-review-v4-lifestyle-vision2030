'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  Gift, Mic, Sparkles, BookOpen, Instagram, Wifi, Dices, 
  ChevronLeft, ChevronRight, Globe, MessageCircle, RefreshCw 
} from 'lucide-react';

// Passerelle V2 NocoDB
const N8N_RESTAURANTS_API = "https://n8n.srv821341.hstgr.cloud/webhook/get-restaurants-v2";

// Extraction propre des menus déroulants NocoDB
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
  if (typeof raw === 'object' && raw !== null) {
    return (raw.instance_name || raw.restaurant_name || "").trim();
  }
  return "";
};

export default function DynamicRestaurantPortal() {
  const params = useParams();
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [loading, setLoading] = useState(true);
  const [restaurantData, setRestaurantData] = useState<any>(null);

  // 1. Détection universelle de l'instance depuis l'URL (Android & Apple)
  const rawInstance = params?.instance;
  let currentInstance = "";
  if (typeof window !== 'undefined') {
    const path = window.location.pathname;
    const parts = path.split('/r/');
    if (parts.length > 1) {
      const raw = parts[1].split('/')[0].split('?')[0].split('#')[0];
      if (raw) currentInstance = decodeURIComponent(raw).trim().toLowerCase();
    }
  }
  if (!currentInstance) {
    currentInstance = (typeof rawInstance === 'string' ? rawInstance : (Array.isArray(rawInstance) ? rawInstance[0] : "")).trim().toLowerCase();
  }

  useEffect(() => {
    const loadRestaurant = async () => {
      setLoading(true);
      const target = currentInstance.trim().toLowerCase();

      try {
        const res = await fetch(N8N_RESTAURANTS_API);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.list || []);
          
          // Recherche exacte dans NocoDB Table Restaurants
          const matched = list.find((r: any) => {
            const rowInst = parseInstanceName(r.instance_name).toLowerCase();
            return rowInst === target || rowInst.includes(target) || target.includes(rowInst);
          });

          if (matched) {
            // INJECTION DES DONNÉES 100% RÉELLES DE NOCODB
            setRestaurantData({
              restaurant_name: matched.restaurant_name || "Restaurant",
              city: matched.city || "الرياض",
              reward_offer: matched.reward_offer || "هدية مجانية 🎁",
              manager_whatsapp: matched.manager_whatsapp?.toString().replace(/[^0-9]/g, '') || ""
            });
          } else {
            // Secours dynamique formaté à partir de l'URL si l'instance n'est pas trouvée
            const formattedName = target
              ? target.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
              : "Restaurant";

            setRestaurantData({
              restaurant_name: formattedName,
              city: "الرياض",
              reward_offer: "هدية مجانية 🎁",
              manager_whatsapp: ""
            });
          }
        }
      } catch (err) {
        console.error("Erreur de chargement NocoDB:", err);
      } finally {
        setLoading(false);
      }
    };

    loadRestaurant();
  }, [currentInstance]);

  // URL WhatsApp direct générée depuis le numéro NocoDB du gérant
  const cleanPhone = restaurantData?.manager_whatsapp || "";
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : "#";

  const t = {
    ar: {
      welcome: "مرحباً بكم في",
      branch: `فرع ${restaurantData?.city || 'الرياض'} • Branch`,
      heroTitle: `احصل على (${restaurantData?.reward_offer || 'هدية مجانية'}) مجاناً! 🎁`,
      heroSubtitle: "اضغط على الزر الأخضر وسجل ملاحظة صوتية مدتها 5 ثوانٍ على واتساب لاستلام هديتك فوراً في الكاشير!",
      ctaBtn: "إرسال التقييم الصوتي عبر واتساب",
      voiceInstruction: "🎙️ اضغط على زر المايك في واتساب وسجل فويس 5 ثوانٍ",
      step1: "1. انقر للفتح",
      step2: "2. سجل فويس 5s 🎙️",
      step3: "3. استلم هديتك 🎁",
      menuTitle: "قائمة الطعام والمشروبات",
      menuSub: "تصفح المنيو الرقمي الإلكتروني",
      instaTitle: "تابعنا على إنستغرام",
      instaSub: "شارك لحظاتك وسنشاركها في ستوري",
      wifiTitle: "الاتصال بالواي فاي المجاني",
      wifiSub: "انقر للاتصال بشبكة الإنترنت فوراً",
      spinTitle: "عجلة الحظ (Spin & Win)",
      spinSub: "قريباً... العب واكسب جوائز فورية",
      poweredBy: "Powered by Smart Review AI 🚀"
    },
    en: {
      welcome: "Welcome to",
      branch: `${restaurantData?.city || 'Riyadh'} Branch`,
      heroTitle: `Get Your Free (${restaurantData?.reward_offer || 'Gift'}) Now! 🎁`,
      heroSubtitle: "Click the green button below, hold the microphone on WhatsApp, and send a 5-second voice note to claim your reward!",
      ctaBtn: "Send Voice Review on WhatsApp",
      voiceInstruction: "🎙️ Hold the mic icon in WhatsApp to record 5 seconds",
      step1: "1. Tap Open",
      step2: "2. Record 5s Voice 🎙️",
      step3: "3. Claim Gift 🎁",
      menuTitle: "Food & Drinks Menu",
      menuSub: "Browse our interactive digital menu",
      instaTitle: "Follow Us on Instagram",
      instaSub: "Tag us in your photos to get featured",
      wifiTitle: "Free High-Speed Wi-Fi",
      wifiSub: "Click to connect instantly",
      spinTitle: "Spin & Win (Wheel of Fortune)",
      spinSub: "Coming soon... Play and win instant prizes",
      poweredBy: "Powered by Smart Review AI 🚀"
    }
  }[lang];

  // ÉCRAN DE CHARGEMENT ELEGANT AVANT LA RÉPONSE DE NOCODB
  if (loading || !restaurantData) {
    return (
      <div dir="rtl" className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-['Cairo']">
        <div className="text-center space-y-4">
          <RefreshCw className="w-10 h-10 text-amber-500 animate-spin mx-auto" />
          <p className="text-sm font-bold text-zinc-400">جاري تحميل البيانات... / Loading portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-slate-950 to-black text-zinc-100 font-['Cairo',sans-serif] relative flex flex-col justify-between p-4 sm:p-8 overflow-hidden"
    >
      {/* EFFETS LUMINEUX DÉGRADÉS */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-gradient-to-r from-amber-500/20 to-purple-600/20 rounded-full blur-[130px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-full blur-[130px] pointer-events-none"></div>

      <div className="max-w-md mx-auto w-full space-y-7 relative z-10">
        
        {/* HEADER & BOUTON LANGUE */}
        <header className="flex justify-between items-center pt-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/30 backdrop-blur-md">
              NFC Active
            </span>
          </div>

          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/90 border border-white/15 text-xs font-black text-zinc-200 backdrop-blur-xl hover:border-amber-400 transition shadow-lg"
          >
            <Globe className="w-4 h-4 text-amber-400" />
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
        </header>

        {/* BRANDING RESTAURANT EN GRANDES POLICES */}
        <div className="text-center space-y-2 pt-2">
          <p className="text-xs text-amber-400 font-black uppercase tracking-widest">{t.welcome}</p>
          <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 tracking-tight leading-tight">
            {restaurantData.restaurant_name}
          </h1>
          <p className="text-xs text-zinc-400 font-bold">{t.branch}</p>
        </div>

        {/* HERO CARD GLASSMORPHISM VIBRANTE */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 rounded-3xl blur-md opacity-75 group-hover:opacity-100 transition duration-1000 animate-pulse"></div>
          
          <div className="relative bg-zinc-900/90 border border-white/15 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
            
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-amber-500/10 border border-amber-500/40 text-amber-300 px-4 py-1.5 rounded-full text-xs font-black shadow-inner">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              <span>عرض خاص • Special Offer</span>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {t.heroTitle}
              </h2>
              <p className="text-sm text-zinc-300 leading-relaxed font-semibold">
                {t.heroSubtitle}
              </p>
            </div>

            {/* LE GROS BOUTON WHATSAPP VERT (#25D366) VIBRANT */}
            <div className="space-y-3 pt-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-[#25D366] via-emerald-500 to-[#128C7E] hover:scale-[1.02] text-white font-black text-lg sm:text-xl py-5 px-6 rounded-2xl shadow-[0_10px_30px_rgba(37,211,102,0.4)] transition-all duration-300 transform active:scale-95 border border-emerald-400/40"
              >
                <MessageCircle className="w-7 h-7 fill-white text-emerald-800" />
                <span>{t.ctaBtn}</span>
                <Mic className="w-6 h-6 animate-bounce" />
              </a>

              <p className="text-xs text-emerald-300 font-bold bg-emerald-950/60 py-2 px-3 rounded-xl border border-emerald-500/30">
                {t.voiceInstruction}
              </p>
            </div>

            {/* 3 Étapes Visuelles LISIBLES */}
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/10 text-xs text-zinc-300 font-bold">
              <div className="p-1.5 bg-zinc-950/50 rounded-xl border border-white/5">{t.step1}</div>
              <div className="p-1.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">{t.step2}</div>
              <div className="p-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">{t.step3}</div>
            </div>

          </div>
        </div>

        {/* LIENS SECONDAIRES */}
        <div className="space-y-3.5 pt-2">
          
          {/* MENU DIGITAL */}
          <a
            href="https://google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between bg-zinc-900/80 border border-white/10 backdrop-blur-xl p-5 rounded-2xl shadow-lg hover:border-amber-400/50 hover:bg-zinc-800/80 transition group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/15 text-amber-400 rounded-xl border border-amber-500/30">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="text-start">
                <p className="font-bold text-base sm:text-lg text-white group-hover:text-amber-400 transition">{t.menuTitle}</p>
                <p className="text-xs text-zinc-400 font-medium">{t.menuSub}</p>
              </div>
            </div>
            {lang === 'ar' ? <ChevronLeft className="w-5 h-5 text-zinc-500" /> : <ChevronRight className="w-5 h-5 text-zinc-500" />}
          </a>

          {/* INSTAGRAM */}
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between bg-zinc-900/80 border border-white/10 backdrop-blur-xl p-5 rounded-2xl shadow-lg hover:border-pink-400/50 hover:bg-zinc-800/80 transition group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-pink-500/15 text-pink-400 rounded-xl border border-pink-500/30">
                <Instagram className="w-6 h-6" />
              </div>
              <div className="text-start">
                <p className="font-bold text-base sm:text-lg text-white group-hover:text-pink-400 transition">{t.instaTitle}</p>
                <p className="text-xs text-zinc-400 font-medium">{t.instaSub}</p>
              </div>
            </div>
            {lang === 'ar' ? <ChevronLeft className="w-5 h-5 text-zinc-500" /> : <ChevronRight className="w-5 h-5 text-zinc-500" />}
          </a>

          {/* WI-FI */}
          <a
            href="#wifi"
            className="flex items-center justify-between bg-zinc-900/80 border border-white/10 backdrop-blur-xl p-5 rounded-2xl shadow-lg hover:border-emerald-400/50 hover:bg-zinc-800/80 transition group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/30">
                <Wifi className="w-6 h-6" />
              </div>
              <div className="text-start">
                <p className="font-bold text-base sm:text-lg text-white group-hover:text-emerald-400 transition">{t.wifiTitle}</p>
                <p className="text-xs text-zinc-400 font-medium">{t.wifiSub}</p>
              </div>
            </div>
            {lang === 'ar' ? <ChevronLeft className="w-5 h-5 text-zinc-500" /> : <ChevronRight className="w-5 h-5 text-zinc-500" />}
          </a>

          {/* SPIN & WIN PREVIEW */}
          <div className="flex items-center justify-between bg-zinc-900/40 border border-white/5 backdrop-blur-md p-5 rounded-2xl relative overflow-hidden">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                <Dices className="w-6 h-6" />
              </div>
              <div className="text-start">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-base sm:text-lg text-zinc-300">{t.spinTitle}</p>
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 font-black px-2.5 py-0.5 rounded-full border border-purple-500/30">v2.0 Soon</span>
                </div>
                <p className="text-xs text-zinc-500">{t.spinSub}</p>
              </div>
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <footer className="pt-6 pb-2 text-center">
          <p className="text-xs text-zinc-500 font-bold tracking-wider">
            {t.poweredBy}
          </p>
        </footer>

      </div>
    </div>
  );
}
