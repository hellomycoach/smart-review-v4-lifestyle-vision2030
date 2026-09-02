'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Gift, Mic, Sparkles, BookOpen, Instagram, Wifi, Dices, 
  ChevronLeft, ChevronRight, Globe, MessageCircle, RefreshCw,
  CreditCard, Utensils, Star, ExternalLink, CheckCircle2
} from 'lucide-react';

const N8N_RESTAURANTS_API = "https://n8n.srv821341.hstgr.cloud/webhook/get-restaurants";

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
  const router = useRouter();
  
  const [lang, setLang] = useState<'ar' | 'fr' | 'en'>('ar');
  const [loading, setLoading] = useState(true);
  const [showWifiModal, setShowWifiModal] = useState(false);
  
  const [restaurantData, setRestaurantData] = useState<any>({
    restaurant_name: "Restaurant",
    city: "Doha",
    country: "Qatar",
    currency: "QAR",
    reward_offer: "هدية مجانية 🎁",
    loyalty_reward: "1 Froccino VIP offert 🎁",
    manager_whatsapp: "",
    wifi_password: "WiFi@2026",
    logo_url: "",
    cover_image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
    primary_color: "#C5A880"
  });

  // Détection universelle de l'instance
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
    currentInstance = (typeof rawInstance === 'string' ? rawInstance : (Array.isArray(rawInstance) ? rawInstance[0] : "")).trim().toLowerCase() || 'bos_cafe_moq';
  }

  // Auto-détection de langue
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userLang = (navigator.language || 'ar').toLowerCase();
      if (userLang.startsWith('fr')) setLang('fr');
      else if (userLang.startsWith('en')) setLang('en');
      else setLang('ar');
    }
  }, []);

  // Chargement des données et de la charte graphique depuis NocoDB
  useEffect(() => {
    const loadRestaurant = async () => {
      setLoading(true);
      const target = currentInstance.trim().toLowerCase();

      try {
        const res = await fetch(`${N8N_RESTAURANTS_API}?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.list || []);
          
          const matched = list.find((r: any) => {
            const rowInst = parseInstanceName(r.instance_name).toLowerCase();
            return rowInst === target || rowInst.includes(target) || target.includes(rowInst);
          });

          if (matched) {
            setRestaurantData({
              restaurant_name: matched.restaurant_name || "Bo's Coffee",
              city: matched.city || "Doha",
              country: matched.country || "Qatar",
              currency: matched.currency || "QAR",
              reward_offer: matched.reward_offer || "1 Café ou Cookie offert ☕",
              loyalty_reward: matched.loyalty_reward || "1 Froccino VIP offert 🎁",
              manager_whatsapp: matched.manager_whatsapp?.toString().replace(/[^0-9]/g, '') || "33767803233",
              wifi_password: matched.wifi_password || "BosCoffee@2026",
              logo_url: matched.logo_url || "",
              cover_image: matched.cover_image || "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
              primary_color: matched.primary_color || "#C5A880"
            });
          } else {
            const formattedName = target
              ? target.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
              : "Restaurant";

            setRestaurantData((prev: any) => ({
              ...prev,
              restaurant_name: formattedName
            }));
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

  // Message pré-rempli WhatsApp pour l'avis Google
  const cleanPhone = restaurantData?.manager_whatsapp || "33767803233";
  const defaultReviewMessage = lang === 'ar'
    ? `مرحباً ${restaurantData.restaurant_name}، أود مشاركة تجربتي وتقييمي للحصول على ${restaurantData.reward_offer}`
    : (lang === 'fr'
        ? `Bonjour ${restaurantData.restaurant_name}, je souhaite partager mon avis et profiter de mon offre : ${restaurantData.reward_offer}`
        : `Hello ${restaurantData.restaurant_name}, I would like to review my experience and claim my offer: ${restaurantData.reward_offer}`);

  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(defaultReviewMessage)}`;

  const isRTL = lang === 'ar';

  const t = {
    ar: {
      welcome: "مرحباً بكم في",
      branch: `فرع ${restaurantData?.city || 'الدوحة'} • Branch`,
      heroBadge: "هدية ضيافة فورية 🎁",
      heroTitle: `احصل على (${restaurantData?.reward_offer || 'هدية مجانية'}) الآن!`,
      heroSubtitle: "اضغط على الزر الأخضر وسجل ملاحظة صوتية مدتها 5 ثوانٍ على واتساب لاستلام هديتك فوراً في الكاشير!",
      ctaBtn: "إرسال التقييم واستلام الهدية",
      voiceInstruction: "🎙️ اضغط مطولاً على زر المايك في واتساب وسجل 5 ثوانٍ",
      step1: "1. انقر للفتح 📲",
      step2: "2. سجل 5s صوت 🎙️",
      step3: "3. استلم هديتك 🎁",
      orderMenuTitle: "قائمة الطعام والطلب للطاولة",
      orderMenuSub: "تصفح 52 صنفاً واطلب مباشرة لطاولتك",
      spinTitle: "عجلة الحظ VIP (Spin & Win)",
      spinSub: "أدر العجلة واربح تحلية أو قهوة مجانية",
      loyaltyTitle: "بطاقة الولاء الرقمية VIP",
      loyaltySub: "اجمع 10 نقاط واحصل على مشروبك المجاني",
      wifiTitle: "الاتصال بالواي فاي المجاني",
      wifiSub: "انقر للحصول على كلمة المرور والاتصال",
      wifiModalTitle: "شبكة الواي فاي للضيوف",
      wifiNetwork: "اسم الشبكة (SSID)",
      wifiPass: "كلمة المرور",
      wifiCopy: "نسخ كلمة المرور",
      copied: "تم النسخ بنجاح!",
      close: "إغلاق",
      poweredBy: "تجربة ضيافة ذكية برعاية Smart Review AI 🚀"
    },
    fr: {
      welcome: "Bienvenue chez",
      branch: `Établissement ${restaurantData?.city || 'Doha'}`,
      heroBadge: "Offre de Bienvenue VIP 🎁",
      heroTitle: `Votre (${restaurantData?.reward_offer || 'Cadeau'}) Offert !`,
      heroSubtitle: "Cliquez ci-dessous, enregistrez un message vocal de 5 secondes sur WhatsApp et recevez votre récompense immédiatement en caisse !",
      ctaBtn: "Donner mon Avis sur WhatsApp",
      voiceInstruction: "🎙️ Maintenez l'icône micro sur WhatsApp et parlez 5 secondes",
      step1: "1. Ouvrir WhatsApp 📲",
      step2: "2. Vocal de 5 sec 🎙️",
      step3: "3. Cadeau en Caisse 🎁",
      orderMenuTitle: "Menu Digital & Commande à Table",
      orderMenuSub: "Consultez la carte complète et commandez en direct",
      spinTitle: "Roue des Récompenses (Spin & Win)",
      spinSub: "Tentez votre chance et gagnez des surprises VIP",
      loyaltyTitle: "Carte de Fidélité Digitale",
      loyaltySub: "Cumulez vos tampons et débloquez vos boissons offertes",
      wifiTitle: "Wi-Fi Haut Débit Gratuit",
      wifiSub: "Cliquez pour afficher le mot de passe réseau",
      wifiModalTitle: "Connexion Wi-Fi Client",
      wifiNetwork: "Réseau Wi-Fi",
      wifiPass: "Mot de passe",
      wifiCopy: "Copier le mot de passe",
      copied: "Copié dans le presse-papier !",
      close: "Fermer",
      poweredBy: "Propulsé par Smart Review AI 🚀"
    },
    en: {
      welcome: "Welcome to",
      branch: `${restaurantData?.city || 'Doha'} Branch`,
      heroBadge: "Instant Welcome Reward 🎁",
      heroTitle: `Claim Your Free (${restaurantData?.reward_offer || 'Gift'})!`,
      heroSubtitle: "Click below, hold the microphone on WhatsApp, and send a 5-second voice review to claim your treat instantly at the counter!",
      ctaBtn: "Send WhatsApp Voice Review",
      voiceInstruction: "🎙️ Hold the mic icon on WhatsApp and record 5 seconds",
      step1: "1. Open WhatsApp 📲",
      step2: "2. 5s Voice Note 🎙️",
      step3: "3. Claim Treat 🎁",
      orderMenuTitle: "Digital Menu & Table Ordering",
      orderMenuSub: "Explore our full catalog and order right to your table",
      spinTitle: "Spin & Win (Wheel of Fortune)",
      spinSub: "Spin the wheel for desserts, drinks & surprises",
      loyaltyTitle: "Digital VIP Loyalty Card",
      loyaltySub: "Collect 10 stamps and earn your free reward",
      wifiTitle: "Free Guest Wi-Fi",
      wifiSub: "Click to get the network password",
      wifiModalTitle: "Guest Wi-Fi Network",
      wifiNetwork: "Network Name (SSID)",
      wifiPass: "Password",
      wifiCopy: "Copy Password",
      copied: "Copied to clipboard!",
      close: "Close",
      poweredBy: "Powered by Smart Review AI 🚀"
    }
  }[lang];

  const [copiedWifi, setCopiedWifi] = useState(false);
  const handleCopyWifi = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(restaurantData.wifi_password || "BosCoffee@2026");
      setCopiedWifi(true);
      setTimeout(() => setCopiedWifi(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-[#C8102E] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const primaryColor = restaurantData.primary_color || "#C8102E";

  return (
    <div 
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#FAF8F5] text-[#2B1810] font-sans relative flex flex-col justify-between p-4 sm:p-6 overflow-hidden"
      style={{ fontFamily: "'Cairo', system-ui, -apple-system, sans-serif" }}
    >
      {/* PHOTO DE FOND BRANDÉE AVEC OVERLAY LUMINEUX */}
      {restaurantData.cover_image && (
        <div className="absolute top-0 inset-x-0 h-[480px] z-0 overflow-hidden opacity-30 pointer-events-none">
          <img 
            src={restaurantData.cover_image} 
            alt={restaurantData.restaurant_name}
            className="w-full h-full object-cover filter blur-[2px] scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FAF8F5]/60 to-[#FAF8F5]"></div>
        </div>
      )}

      {/* HALOS CHAUDS */}
      <div className="fixed top-[-10%] right-[-10%] w-96 h-96 bg-[#C8102E]/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-96 h-96 bg-[#D4A373]/15 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-md mx-auto w-full space-y-6 relative z-10 my-auto">
        
        {/* HEADER : LOGO & BOUTON LANGUE */}
        <header className="flex justify-between items-center pt-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>
            <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 shadow-sm">
              NFC & QR Active
            </span>
          </div>

          <div className="flex bg-white/90 backdrop-blur-md p-0.5 rounded-full border border-[#E8DDD0] shadow-sm">
            {(['ar', 'fr', 'en'] as const).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${
                  lang === l 
                    ? 'bg-[#C8102E] text-white font-black shadow-sm' 
                    : 'text-[#7A695B] hover:text-[#2B1810]'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </header>

        {/* IDENTITÉ DU RESTAURANT */}
        <div className="text-center space-y-2 pt-1">
          {restaurantData.logo_url && (
            <div className="w-20 h-20 mx-auto rounded-full overflow-hidden p-1 bg-white shadow-lg ring-2 ring-[#C8102E]/20 mb-3">
              <img 
                src={restaurantData.logo_url} 
                alt="Logo"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
          )}
          <p className="text-xs text-[#C8102E] font-black uppercase tracking-widest">{t.welcome}</p>
          <h1 className="text-3xl sm:text-4xl font-black text-[#2B1810] tracking-tight leading-tight">
            {restaurantData.restaurant_name}
          </h1>
          <p className="text-xs text-[#7A695B] font-bold">{t.branch}</p>
        </div>

        {/* HERO CARD CLAIRE : AVIS GOOGLE & CADEAU */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#C8102E]/30 via-[#25D366]/40 to-[#D4A373]/30 rounded-3xl blur-md opacity-70 group-hover:opacity-100 transition duration-1000 animate-pulse"></div>
          
          <div className="relative bg-white/95 border border-[#E8DDD0] backdrop-blur-2xl rounded-3xl p-6 sm:p-7 text-center space-y-5 shadow-[0_15px_40px_rgba(43,24,16,0.08)]">
            
            <div className="inline-flex items-center gap-2 bg-[#C8102E]/10 border border-[#C8102E]/20 text-[#C8102E] px-4 py-1.5 rounded-full text-xs font-black shadow-inner">
              <Sparkles className="w-4 h-4 text-[#C8102E] animate-spin" />
              <span>{t.heroBadge}</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-[#2B1810] leading-tight">
                {t.heroTitle}
              </h2>
              <p className="text-xs text-[#7A695B] leading-relaxed font-semibold">
                {t.heroSubtitle}
              </p>
            </div>

            {/* LE GROS BOUTON WHATSAPP AVIS VOCAL */}
            <div className="space-y-3 pt-1">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-[#25D366] via-emerald-500 to-[#128C7E] hover:scale-[1.02] text-white font-black text-base sm:text-lg py-4 px-6 rounded-2xl shadow-[0_10px_25px_rgba(37,211,102,0.4)] transition-all duration-300 transform active:scale-98 border border-emerald-400/40"
              >
                <MessageCircle className="w-6 h-6 fill-white text-emerald-800" />
                <span>{t.ctaBtn}</span>
                <Mic className="w-5 h-5 animate-bounce" />
              </a>

              <p className="text-[11px] text-emerald-800 font-bold bg-emerald-50 py-2 px-3 rounded-xl border border-emerald-200">
                {t.voiceInstruction}
              </p>
            </div>

            {/* 3 Étapes Visuelles */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#EAE0D5] text-[11px] text-[#7A695B] font-bold">
              <div className="p-1.5 bg-[#FAF8F5] rounded-xl border border-[#EAE0D5]">{t.step1}</div>
              <div className="p-1.5 bg-[#C8102E]/10 rounded-xl border border-[#C8102E]/20 text-[#C8102E]">{t.step2}</div>
              <div className="p-1.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-700">{t.step3}</div>
            </div>

          </div>
        </div>

        {/* GRILLE DES SERVICES DU RESTAURANT (THÈME CLAIR) */}
        <div className="space-y-3 pt-1">
          
          {/* 1. COMMANDE DIGITALE À TABLE */}
          <Link
            href={`/order/${currentInstance}?table=01`}
            className="flex items-center justify-between bg-white/95 border border-[#E8DDD0] backdrop-blur-xl p-4.5 rounded-2xl shadow-sm hover:border-[#C8102E] hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-[#C8102E]/10 text-[#C8102E] rounded-xl border border-[#C8102E]/20 group-hover:scale-110 transition-transform">
                <Utensils className="w-6 h-6" />
              </div>
              <div className="text-start">
                <p className="font-bold text-sm sm:text-base text-[#2B1810] group-hover:text-[#C8102E] transition">
                  {t.orderMenuTitle}
                </p>
                <p className="text-xs text-[#7A695B] font-medium">{t.orderMenuSub}</p>
              </div>
            </div>
            {isRTL ? <ChevronLeft className="w-5 h-5 text-[#7A695B]" /> : <ChevronRight className="w-5 h-5 text-[#7A695B]" />}
          </Link>

          {/* 2. ROUE DES CADEAUX VIP */}
          <Link
            href={`/spin/${currentInstance}`}
            className="flex items-center justify-between bg-white/95 border border-[#E8DDD0] backdrop-blur-xl p-4.5 rounded-2xl shadow-sm hover:border-purple-400 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-purple-50 text-purple-700 rounded-xl border border-purple-200 group-hover:scale-110 transition-transform">
                <Dices className="w-6 h-6" />
              </div>
              <div className="text-start">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm sm:text-base text-[#2B1810] group-hover:text-purple-700 transition">
                    {t.spinTitle}
                  </p>
                  <span className="text-[10px] bg-purple-100 text-purple-800 font-black px-2 py-0.2 rounded-full border border-purple-300">VIP</span>
                </div>
                <p className="text-xs text-[#7A695B] font-medium">{t.spinSub}</p>
              </div>
            </div>
            {isRTL ? <ChevronLeft className="w-5 h-5 text-[#7A695B]" /> : <ChevronRight className="w-5 h-5 text-[#7A695B]" />}
          </Link>

          {/* 3. CARTE DE FIDÉLITÉ DIGITALE */}
          <Link
            href={`/card/33767803233?instance=${currentInstance}`}
            className="flex items-center justify-between bg-white/95 border border-[#E8DDD0] backdrop-blur-xl p-4.5 rounded-2xl shadow-sm hover:border-amber-400 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 group-hover:scale-110 transition-transform">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="text-start">
                <p className="font-bold text-sm sm:text-base text-[#2B1810] group-hover:text-amber-800 transition">
                  {t.loyaltyTitle}
                </p>
                <p className="text-xs text-[#7A695B] font-medium">{t.loyaltySub}</p>
              </div>
            </div>
            {isRTL ? <ChevronLeft className="w-5 h-5 text-[#7A695B]" /> : <ChevronRight className="w-5 h-5 text-[#7A695B]" />}
          </Link>

          {/* 4. MODALE WI-FI */}
          <button
            onClick={() => setShowWifiModal(true)}
            className="w-full flex items-center justify-between bg-white/95 border border-[#E8DDD0] backdrop-blur-xl p-4.5 rounded-2xl shadow-sm hover:border-emerald-500 hover:shadow-md transition-all group text-start"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 group-hover:scale-110 transition-transform">
                <Wifi className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-sm sm:text-base text-[#2B1810] group-hover:text-emerald-700 transition">
                  {t.wifiTitle}
                </p>
                <p className="text-xs text-[#7A695B] font-medium">{t.wifiSub}</p>
              </div>
            </div>
            {isRTL ? <ChevronLeft className="w-5 h-5 text-[#7A695B]" /> : <ChevronRight className="w-5 h-5 text-[#7A695B]" />}
          </button>

        </div>

        {/* FOOTER */}
        <footer className="pt-4 pb-2 text-center">
          <p className="text-[11px] text-[#7A695B] font-bold tracking-wider">
            {t.poweredBy} • {restaurantData.city || 'Doha'}, {restaurantData.country || 'Qatar'} 🇶🇦
          </p>
        </footer>

      </div>

      {/* MODALE WI-FI (THÈME CLAIR) */}
      {showWifiModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-[#E8DDD0] rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl text-[#2B1810]">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-inner">
              <Wifi className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-black text-[#2B1810]">{t.wifiModalTitle}</h3>

            <div className="bg-[#FAF8F5] rounded-2xl p-3 border border-[#E8DDD0] text-start space-y-2 text-xs">
              <div>
                <span className="text-[#7A695B] font-bold block text-[10px] uppercase">{t.wifiNetwork}</span>
                <span className="text-[#2B1810] font-bold font-mono text-sm">{restaurantData.restaurant_name} Guest</span>
              </div>
              <div className="pt-2 border-t border-[#EAE0D5]">
                <span className="text-[#7A695B] font-bold block text-[10px] uppercase">{t.wifiPass}</span>
                <span className="text-[#C8102E] font-black font-mono text-base">{restaurantData.wifi_password}</span>
              </div>
            </div>

            <button
              onClick={handleCopyWifi}
              className="w-full py-3 rounded-2xl bg-[#C8102E] hover:bg-[#A31D24] text-white font-black text-xs transition-all shadow-md active:scale-98 flex items-center justify-center gap-1.5"
            >
              {copiedWifi ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Wifi className="w-4 h-4" />}
              <span>{copiedWifi ? t.copied : t.wifiCopy}</span>
            </button>

            <button
              onClick={() => setShowWifiModal(false)}
              className="w-full py-2 text-xs text-[#7A695B] hover:text-[#2B1810] font-bold transition-colors"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
