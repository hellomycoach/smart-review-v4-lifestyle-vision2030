'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  Gift, Mic, Sparkles, BookOpen, Instagram, Wifi, Dices, 
  Globe, MessageCircle, RefreshCw, X, CheckCircle, Phone,
  ChevronLeft, ChevronRight
} from 'lucide-react';

const N8N_RESTAURANTS_API = "https://n8n.srv821341.hstgr.cloud/webhook/get-restaurants-v3";
const N8N_SAVE_LEAD_API = "https://n8n.srv821341.hstgr.cloud/webhook/save-wifi-lead-v3";

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

export default function TablePortalV3() {
  const params = useParams();
  
  // Sélecteur de Langue (Arabe par défaut)
  const [lang, setLang] = useState<'ar' | 'en' | 'fr'>('ar');
  const [loading, setLoading] = useState(false);

  // MODAL ROUE
  const [showWheelModal, setShowWheelModal] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  
  // MODAL WIFI LEAD
  const [showWifiModal, setShowWifiModal] = useState(false);
  const [wifiPhone, setWifiPhone] = useState('');
  const [wifiSuccess, setWifiSuccess] = useState(false);
  const [isSubmittingWifi, setIsSubmittingWifi] = useState(false);

  let currentInstance = "";
  if (typeof window !== 'undefined') {
    const parts = window.location.pathname.split('/spin/');
    if (parts.length > 1) {
      currentInstance = parts[1].split('/')[0].split('?')[0];
    }
  }
  if (!currentInstance) {
    const rawInstance = params?.instance;
    currentInstance = (typeof rawInstance === 'string' ? rawInstance : (Array.isArray(rawInstance) ? rawInstance[0] : "")).trim();
  }
  if (!currentInstance) currentInstance = "bella_italia_riyadh";

  const isBella = currentInstance.toLowerCase().includes("bella");

  const [restaurantData, setRestaurantData] = useState<any>({
    restaurant_name: isBella ? "Bella Italia" : "Elixir Coffee Riyadh",
    city: isBella ? "Djeddah" : "الرياض",
    reward_offer: isBella ? "1 Tiramisu offert 🍰" : "1 Café offert ☕",
    manager_whatsapp: isBella ? "41779874995" : "966530629832",
    wifi_password: isBella ? "BellaWiFi2026" : "ElixirWiFi2026"
  });

  // DÉTECTION AUTOMATIQUE DE LA LANGUE DU SMARTPHONE
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.language) {
      const userLang = navigator.language.toLowerCase();
      if (userLang.startsWith('fr')) {
        setLang('fr');
      } else if (userLang.startsWith('ar')) {
        setLang('ar');
      } else {
        setLang('en');
      }
    }
  }, []);

  // Chargement dynamique depuis NocoDB
  useEffect(() => {
    const loadRestaurant = async () => {
      try {
        const res = await fetch(N8N_RESTAURANTS_API);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.list || []);
          
          const matched = list.find((r: any) => {
            const rowInst = parseInstanceName(r.instance_name).toLowerCase();
            return rowInst === currentInstance.toLowerCase() || rowInst.includes(currentInstance.toLowerCase());
          });

          if (matched) {
            setRestaurantData({
              restaurant_name: matched.restaurant_name || restaurantData.restaurant_name,
              city: matched.city || restaurantData.city,
              reward_offer: matched.reward_offer || restaurantData.reward_offer,
              manager_whatsapp: matched.manager_whatsapp?.toString().replace(/[^0-9]/g, '') || restaurantData.manager_whatsapp,
              wifi_password: matched.wifi_password || restaurantData.wifi_password
            });
          }
        }
      } catch (err) {
        console.error("Erreur de chargement:", err);
      }
    };

    loadRestaurant();
  }, [currentInstance]);

  const spinWheel = () => {
    if (isSpinning) return;
    setIsSpinning(true);

    const totalRotation = rotation + 1800 + Math.floor(Math.random() * 360);
    setRotation(totalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setShowWheelModal(false);
      setShowWinnerModal(true);
    }, 3800);
  };

  const handleWifiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wifiPhone.trim()) return;
    setIsSubmittingWifi(true);

    try {
      await fetch(N8N_SAVE_LEAD_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_phone: wifiPhone.trim(),
          instance_name: currentInstance,
          source: "WiFi"
        }),
      });
      setWifiSuccess(true);
    } catch (err) {
      setWifiSuccess(true);
    } finally {
      setIsSubmittingWifi(false);
    }
  };

  const cleanPhone = restaurantData?.manager_whatsapp || "966530629832";
  const whatsappUrl = `https://wa.me/${cleanPhone}`;

  const t = {
    ar: {
      langLabel: "العربية",
      welcome: "مرحباً بكم في",
      branch: `فرع ${restaurantData?.city || 'الرياض'} • Branch`,
      heroTitle: `احصل على (${restaurantData?.reward_offer || 'هدية مجانية'}) مجاناً! 🎁`,
      heroSubtitle: "اضغط على الزر الأخضر وسجل ملاحظة صوتية مدتها 5 ثوانٍ على واتساب لاستلام هديتك فوراً في الكاشير!",
      ctaBtn: "إرسال التقييم الصوتي عبر واتساب",
      voiceInstruction: "🎙️ اضغط على زر المايك في واتساب وسجل فويس 5 ثوانٍ",
      openSpinBtn: "🎡 جرب حظك مع عجلة الجوائز (Spin & Win)",
      step1: "1. انقر للفتح",
      step2: "2. سجل فويس 5s 🎙️",
      step3: "3. استلم هديتك 🎁",
      menuTitle: "قائمة الطعام والمشروبات",
      menuSub: "تصفح المنيو الرقمي الإلكتروني",
      instaTitle: "تابعنا على إنستغرام",
      instaSub: "شارك لحظاتك وسنشاركها في ستوري",
      wifiTitle: "الاتصال بالواي فاي المجاني",
      wifiSub: "أدخل رقمك لاستلام كلمة المرور فوراً",
      wifiSuccessMsg: "تم إرسال كلمة المرور إلى واتساب الخاص بك بنجاح! 📶",
      wifiPasswordLabel: "كلمة المرور:",
      winTitle: "مبروك! لقد كسبت:",
      poweredBy: "Powered by Smart Review AI v3.0 🚀"
    },
    en: {
      langLabel: "English",
      welcome: "Welcome to",
      branch: `${restaurantData?.city || 'Riyadh'} Branch`,
      heroTitle: `Get Your Free (${restaurantData?.reward_offer || 'Gift'}) Now! 🎁`,
      heroSubtitle: "Click the green button below, hold the microphone on WhatsApp, and send a 5-second voice note to claim your reward!",
      ctaBtn: "Send Voice Review on WhatsApp",
      voiceInstruction: "🎙️ Hold the mic icon in WhatsApp to record 5 seconds",
      openSpinBtn: "🎡 Spin the Wheel & Win Prizes",
      step1: "1. Tap Open",
      step2: "2. Record 5s Voice 🎙️",
      step3: "3. Claim Gift 🎁",
      menuTitle: "Food & Drinks Menu",
      menuSub: "Browse our interactive digital menu",
      instaTitle: "Follow Us on Instagram",
      instaSub: "Tag us in your photos to get featured",
      wifiTitle: "Free High-Speed Wi-Fi",
      wifiSub: "Enter your phone to get Wi-Fi password",
      wifiSuccessMsg: "Wi-Fi password sent successfully to your WhatsApp! 📶",
      wifiPasswordLabel: "Wi-Fi Password:",
      winTitle: "Congratulations! You Won:",
      poweredBy: "Powered by Smart Review AI v3.0 🚀"
    },
    fr: {
      langLabel: "Français",
      welcome: "Bienvenue chez",
      branch: `Branche de ${restaurantData?.city || 'Riyad'} • Branch`,
      heroTitle: `Obtenez votre (${restaurantData?.reward_offer || 'Cadeau'}) offert ! 🎁`,
      heroSubtitle: "Cliquez sur le bouton vert ci-dessous, maintenez le micro sur WhatsApp et envoyez un vocal de 5 secondes pour recevoir votre cadeau en caisse !",
      ctaBtn: "Envoyer un Vocal d'Avis sur WhatsApp",
      voiceInstruction: "🎙️ Maintenez l'icône micro dans WhatsApp pour enregistrer 5s",
      openSpinBtn: "🎡 Tourner la Roue de la Fortune",
      step1: "1. Appuyer Ouvrir",
      step2: "2. Vocal de 5s 🎙️",
      step3: "3. Récompense 🎁",
      menuTitle: "Menu Carte & Boissons",
      menuSub: "Consultez notre menu digital interactif",
      instaTitle: "Suivez-nous sur Instagram",
      instaSub: "Taguez-nous dans vos photos pour être partagé",
      wifiTitle: "Wi-Fi Gratuit Haut Débit",
      wifiSub: "Entrez votre numéro pour recevoir le mot de passe Wi-Fi",
      wifiSuccessMsg: "Mot de passe Wi-Fi envoyé avec succès sur votre WhatsApp ! 📶",
      wifiPasswordLabel: "Mot de passe Wi-Fi :",
      winTitle: "Félicitations ! Vous avez gagné :",
      poweredBy: "Propulsé par Smart Review AI v3.0 🚀"
    }
  }[lang];

  return (
    <div 
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-slate-950 to-black text-zinc-100 font-['Cairo',sans-serif] relative flex flex-col justify-between p-4 sm:p-8 overflow-hidden selection:bg-emerald-500 selection:text-white"
    >
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-amber-500/20 rounded-full blur-[130px] pointer-events-none"></div>

      <div className="max-w-md mx-auto w-full space-y-6 relative z-10">
        
        {/* HEADER & SELECTEUR DE LANGUE TRILINGUE (AR / EN / FR) */}
        <header className="flex justify-between items-center pt-2">
          <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30 backdrop-blur-md">
            NFC Table Active
          </span>

          <div className="flex items-center gap-1 bg-zinc-900/90 border border-white/15 p-1 rounded-full backdrop-blur-xl shadow-lg">
            <button
              onClick={() => setLang('ar')}
              className={`px-2.5 py-1 rounded-full text-xs font-black transition ${
                lang === 'ar' ? 'bg-amber-500 text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              🇸🇦 العربية
            </button>

            <button
              onClick={() => setLang('en')}
              className={`px-2.5 py-1 rounded-full text-xs font-black transition ${
                lang === 'en' ? 'bg-amber-500 text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              🇬🇧 EN
            </button>

            <button
              onClick={() => setLang('fr')}
              className={`px-2.5 py-1 rounded-full text-xs font-black transition ${
                lang === 'fr' ? 'bg-amber-500 text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              🇫🇷 FR
            </button>
          </div>
        </header>

        {/* BRANDING */}
        <div className="text-center space-y-1">
          <p className="text-xs text-amber-400 font-black uppercase tracking-widest">{t.welcome}</p>
          <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500">
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
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-[#25D366] via-emerald-500 to-[#128C7E] hover:scale-[1.02] text-white font-black text-lg sm:text-xl py-5 px-6 rounded-2xl shadow-[0_10px_30px_rgba(37,211,102,0.4)] transition-all duration-300 transform active:scale-95 border border-emerald-400/40 cursor-pointer touch-manipulation z-30"
              >
                <MessageCircle className="w-7 h-7 fill-white text-emerald-800 pointer-events-none" />
                <span className="pointer-events-none">{t.ctaBtn}</span>
                <Mic className="w-6 h-6 animate-bounce pointer-events-none" />
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

        {/* BOUTON ROUE DE LA FORTUNE */}
        <button
          onClick={() => setShowWheelModal(true)}
          className="w-full bg-gradient-to-r from-purple-900/60 via-purple-800/60 to-purple-900/60 border border-purple-500/40 p-4 rounded-2xl hover:border-purple-400 transition flex items-center justify-between text-amber-300 font-black text-sm shadow-xl"
        >
          <div className="flex items-center gap-3">
            <Dices className="w-6 h-6 text-purple-400 animate-spin" />
            <span>{t.openSpinBtn}</span>
          </div>
          <Sparkles className="w-5 h-5 text-amber-400" />
        </button>

        {/* MODAL ROUE */}
        {showWheelModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border-2 border-purple-500 p-6 rounded-3xl text-center space-y-6 max-w-sm w-full relative shadow-2xl">
              <button 
                onClick={() => setShowWheelModal(false)}
                className="absolute left-4 top-4 text-zinc-500 hover:text-white p-2"
              >
                <X className="w-6 h-6" />
              </button>

              <h3 className="text-xl font-black text-purple-400 pt-2">{t.openSpinBtn}</h3>

              <div className="relative flex flex-col items-center justify-center">
                <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-amber-400 z-20 -mb-3"></div>

                <div 
                  className="w-64 h-64 rounded-full border-4 border-purple-400 shadow-2xl relative overflow-hidden"
                  style={{ 
                    transform: `rotate(${rotation}deg)`,
                    transition: 'transform 3.8s cubic-bezier(0.15, 0.99, 0.18, 0.99)'
                  }}
                >
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-zinc-900 via-purple-950 to-zinc-950 relative flex items-center justify-center">
                    {["🎁 CADEAU", "☕ SURPRISE", "🍰 CADEAU", "✨ SURPRISE", "🎁 CADEAU", "☕ SURPRISE"].map((label, idx) => (
                      <div key={idx} className="absolute w-full h-full flex items-start justify-center pt-3 text-[10px] font-black text-amber-300" style={{ transform: `rotate(${(360 / 6) * idx}deg)`, transformOrigin: '50% 50%' }}>
                        <span className="bg-zinc-900/90 px-1.5 py-0.5 rounded border border-amber-500/30">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={spinWheel}
                  disabled={isSpinning}
                  className="mt-5 w-full py-3.5 px-6 rounded-2xl font-black text-base bg-gradient-to-r from-amber-500 to-amber-400 text-zinc-950 hover:scale-105 transition"
                >
                  {isSpinning ? "Spinning..." : "SPIN NOW! 🚀"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL CADEAU GAGNANT */}
        {showWinnerModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border-2 border-amber-400 p-6 rounded-3xl text-center space-y-6 max-w-sm w-full relative shadow-2xl">
              <button onClick={() => setShowWinnerModal(false)} className="absolute left-4 top-4 text-zinc-500 hover:text-white p-2">
                <X className="w-6 h-6" />
              </button>

              <div className="inline-flex p-4 bg-amber-500/20 text-amber-400 rounded-3xl border border-amber-500/40">
                <Gift className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <p className="text-xs text-amber-400 font-bold uppercase">{t.winTitle}</p>
                <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500">
                  {restaurantData.reward_offer}
                </h3>
              </div>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-[#25D366] via-emerald-500 to-[#128C7E] text-white font-black text-base py-4 px-6 rounded-2xl shadow-lg"
              >
                <MessageCircle className="w-6 h-6 fill-white" />
                <span>{t.ctaBtn}</span>
              </a>
            </div>
          </div>
        )}

        {/* LIENS SECONDAIRES & WIFI */}
        <div className="space-y-3.5 pt-2">
          
          <a href="https://google.com" target="_blank" className="flex items-center justify-between bg-zinc-900/80 border border-white/10 p-5 rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/15 text-amber-400 rounded-xl border border-amber-500/30"><BookOpen className="w-6 h-6" /></div>
              <div className="text-start"><p className="font-bold text-base text-white">{t.menuTitle}</p><p className="text-xs text-zinc-400">{t.menuSub}</p></div>
            </div>
            {lang === 'ar' ? <ChevronLeft className="w-5 h-5 text-zinc-500" /> : <ChevronRight className="w-5 h-5 text-zinc-500" />}
          </a>

          <a href="#wifi" onClick={() => setShowWifiModal(true)} className="flex items-center justify-between bg-zinc-900/80 border border-white/10 p-5 rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/30"><Wifi className="w-6 h-6" /></div>
              <div className="text-start"><p className="font-bold text-base text-white">{t.wifiTitle}</p><p className="text-xs text-zinc-400">{t.wifiSub}</p></div>
            </div>
            {lang === 'ar' ? <ChevronLeft className="w-5 h-5 text-zinc-500" /> : <ChevronRight className="w-5 h-5 text-zinc-500" />}
          </a>

        </div>

        {/* MODAL WIFI */}
        {showWifiModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm space-y-5 relative shadow-2xl">
              <button onClick={() => setShowWifiModal(false)} className="absolute left-4 top-4 text-zinc-500 hover:text-white p-2"><X className="w-5 h-5" /></button>
              <div className="text-center space-y-2 pt-2">
                <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20"><Wifi className="w-6 h-6" /></div>
                <h3 className="text-lg font-black text-white">{t.wifiTitle}</h3>
                <p className="text-xs text-zinc-400">{t.wifiSub}</p>
              </div>

              {wifiSuccess ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl text-center space-y-2">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-xs font-bold text-emerald-300">{t.wifiSuccessMsg}</p>
                  <p className="text-xs text-zinc-400">{t.wifiPasswordLabel} <span className="font-mono text-amber-400 font-bold">{restaurantData?.wifi_password || "WiFi2026"}</span></p>
                </div>
              ) : (
                <form onSubmit={handleWifiSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-400 font-bold">WhatsApp Number</label>
                    <input type="tel" required dir="ltr" value={wifiPhone} onChange={(e) => setWifiPhone(e.target.value)} placeholder="966 50 000 0000" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-mono text-zinc-100" />
                  </div>
                  <button type="submit" disabled={isSubmittingWifi} className="w-full bg-emerald-500 text-zinc-950 font-black text-xs py-3 rounded-xl">Get Wi-Fi</button>
                </form>
              )}
            </div>
          </div>
        )}

        <footer className="pt-4 text-center">
          <p className="text-xs text-zinc-500 font-bold tracking-wider">{t.poweredBy}</p>
        </footer>

      </div>
    </div>
  );
}
