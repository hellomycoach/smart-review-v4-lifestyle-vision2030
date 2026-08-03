'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { 
  Gift, Sparkles, Globe, ShieldCheck, Check, QrCode, Smartphone, Cpu, PartyPopper, Award
} from 'lucide-react';

const N8N_FIDELITE_API = "https://n8n.srv821341.hstgr.cloud/webhook/get-fidelite-v3";
const N8N_RESTAURANTS_API = "https://n8n.srv821341.hstgr.cloud/webhook/get-restaurants-v3";
const N8N_COUPONS_API = "https://n8n.srv821341.hstgr.cloud/webhook/get-coupons-v3";

// --- GÉNÉRATEUR CODE-BARRES 1D (CODE 128) ---
function Code128Barcode({ text }: { text: string }) {
  const bars = useMemo(() => {
    let checksum = 104;
    const codeUnits = [104];

    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const val = charCode - 32;
      if (val >= 0 && val <= 95) {
        codeUnits.push(val);
        checksum += val * (i + 1);
      }
    }

    const checkDigit = checksum % 103;
    codeUnits.push(checkDigit);
    codeUnits.push(106);

    let barPattern = "";
    const basePatterns = [
      "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
      "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
      "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
      "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
      "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
      "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
      "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
      "112412","122114","122411","142112","142211","241211","221114","411122","211142","113114",
      "114113","114311","411113","411311","113141","114131","311141","411131","311114","411113",
      "111431","311411","114113","421111","241111","214111","111124","211412","211214","211232","2331112"
    ];

    codeUnits.forEach(unit => {
      barPattern += basePatterns[unit] || "211214";
    });

    return barPattern;
  }, [text]);

  let currentX = 10;
  const elements = [];
  let isBar = true;

  for (let i = 0; i < bars.length; i++) {
    const width = parseInt(bars[i], 10) * 1.6;
    if (isBar) {
      elements.push(
        <rect key={i} x={currentX} y={0} width={width} height={46} fill="#000000" />
      );
    }
    currentX += width;
    isBar = !isBar;
  }

  return (
    <svg viewBox={`0 0 ${currentX + 10} 46`} className="w-full h-11 max-w-[240px] mx-auto" preserveAspectRatio="none">
      {elements}
    </svg>
  );
}

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

export default function VirtualLoyaltyCardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const [lang, setLang] = useState<'ar' | 'en' | 'fr'>('ar');
  const [loading, setLoading] = useState(true);
  const [pendingCoupon, setPendingCoupon] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userLang = (navigator.language || (navigator as any).userLanguage || 'ar').toLowerCase();
      if (userLang.startsWith('fr')) {
        setLang('fr');
      } else if (userLang.startsWith('en')) {
        setLang('en');
      } else {
        setLang('ar');
      }
    }
  }, []);

  const rawPhone = params?.phone;
  let clientPhone = "";
  if (typeof window !== 'undefined') {
    const parts = window.location.pathname.split('/card/');
    if (parts.length > 1) {
      clientPhone = parts[1].split('/')[0].split('?')[0];
    }
  }
  if (!clientPhone) {
    clientPhone = (typeof rawPhone === 'string' ? rawPhone : (Array.isArray(rawPhone) ? rawPhone[0] : "")).trim();
  }
  if (!clientPhone) clientPhone = "33767803233";

  const urlInstance = (searchParams.get('instance') || "").trim().toLowerCase();

  const [stampsCount, setStampsCount] = useState(0);
  const [restaurantData, setRestaurantData] = useState<any>({
    restaurant_name: "Bella Italia",
    city: "الرياض",
    loyalty_reward: "Cadeau VIP",
    max_stamps: 10
  });

  useEffect(() => {
    const loadCardData = async () => {
      setLoading(true);
      try {
        const cleanTargetPhone = clientPhone.replace(/[^0-9]/g, '');
        const targetInst = urlInstance || "bella_italia_riyadh";

        // 1. RESTAURANT
        try {
          const resRest = await fetch(`${N8N_RESTAURANTS_API}?t=${Date.now()}`, { cache: 'no-store' });
          if (resRest.ok) {
            const dataRest = await resRest.json();
            const restList = Array.isArray(dataRest) ? dataRest : (dataRest.list || []);
            
            const matchedRest = restList.find((r: any) => {
              const inst = parseInstanceName(r.instance_name).toLowerCase();
              return inst.includes(targetInst) || targetInst.includes(inst);
            });

            if (matchedRest) {
              setRestaurantData({
                restaurant_name: matchedRest.restaurant_name || "Bella Italia",
                city: matchedRest.city || "الرياض",
                loyalty_reward: matchedRest.loyalty_reward || matchedRest.reward_offer || "Cadeau VIP",
                max_stamps: Number(matchedRest.max_stamps) || 10
              });
            }
          }
        } catch (e) {
          console.error("Erreur chargement restaurant:", e);
        }

        // 2. CARTE DE FIDÉLITÉ (Correction de la valeur 0)
        const resFidelite = await fetch(`${N8N_FIDELITE_API}?t=${Date.now()}`, { cache: 'no-store' });
        if (resFidelite.ok) {
          const dataFidelite = await resFidelite.json();
          const listFidelite = Array.isArray(dataFidelite) ? dataFidelite : (dataFidelite.list || []);
          const reversedList = [...listFidelite].reverse();

          const userCard = reversedList.find((c: any) => {
            const p = c.client_phone?.toString().replace(/[^0-9]/g, '') || "";
            const inst = parseInstanceName(c.instance_name).toLowerCase();
            return (p.includes(cleanTargetPhone) || cleanTargetPhone.includes(p)) &&
                   (targetInst ? (inst === targetInst || inst.includes(targetInst) || targetInst.includes(inst)) : true);
          });

          if (userCard) {
            const rawVal = Number(userCard.stamps_count);
            setStampsCount(isNaN(rawVal) ? 0 : rawVal);
          }
        }

        // 3. COUPONS PENDING
        try {
          const resCoupons = await fetch(`${N8N_COUPONS_API}?t=${Date.now()}`, { cache: 'no-store' });
          if (resCoupons.ok) {
            const dataCoupons = await resCoupons.json();
            const listCoupons = Array.isArray(dataCoupons) ? dataCoupons : (dataCoupons.list || []);
            
            const matchedCoupon = [...listCoupons].reverse().find((cp: any) => {
              const p = cp.client_phone?.toString().replace(/[^0-9]/g, '') || "";
              const status = (cp.status || "").toLowerCase().trim();
              const inst = parseInstanceName(cp.instance_name).toLowerCase();
              
              const matchesPhone = p.includes(cleanTargetPhone) || cleanTargetPhone.includes(p);
              const matchesInst = targetInst ? (inst === targetInst || inst.includes(targetInst) || targetInst.includes(inst)) : true;
              const isPending = status === 'pending' || status === 'unclaimed' || status === 'non_utilise';

              return matchesPhone && matchesInst && isPending;
            });

            setPendingCoupon(matchedCoupon || null);
          }
        } catch (e) {
          console.error("Erreur lecture coupons:", e);
        }

      } catch (err) {
        console.error("Erreur globale chargement:", err);
      } finally {
        setLoading(false);
      }
    };

    loadCardData();
  }, [clientPhone, urlInstance]);

  const maxStamps = Number(restaurantData.max_stamps) || 10;
  const progressPercent = Math.min(100, Math.round((stampsCount / maxStamps) * 100));
  const memberID = `VIP-${clientPhone.slice(-6)}`;

  const t = {
    ar: {
      cardTitle: "بطاقة الولاء الرقمية",
      vipStatus: "عضوية VIP الذهبية",
      stampsLabel: "الأختام الحالية",
      rewardGoal: "الهدية عند إكمال الأختام:",
      addWallet: "📲 إضافة إلى الشاشة الرئيسية (Add to Home Screen)",
      pwaInstruction: "انقر على خيارات المتصفح ➔ 'إضافة إلى الشاشة الرئيسية' للوصول بضغطة واحدة!",
      scanBoxTitle: "مسح سريع للكاشير (1D + 2D)",
      qrInstruction: "أرِ هذه الشاشة للكاشير عند الدفع لتجميع الأختام",
      poweredBy: "Smart Review AI v3.0 • Digital Loyalty Pass",
      branch: "فرع",
      congratsTitle: "🎉 مبروك! لقد كسبت هديتك VIP!",
      congratsDesc: "أبرز كود الكوبون التالي للكاشير لاستلام هديتك فوراً:"
    },
    en: {
      cardTitle: "VIP DIGITAL PASS",
      vipStatus: "GOLD VIP MEMBER",
      stampsLabel: "Current Stamps",
      rewardGoal: "Reward at 10 Stamps:",
      addWallet: "📲 Add to Home Screen",
      pwaInstruction: "Click browser options ➔ 'Add to Home Screen' for 1-tap access!",
      scanBoxTitle: "Instant Scanner Zone (1D + 2D)",
      qrInstruction: "Show this screen to the cashier when paying to collect stamps",
      poweredBy: "Smart Review AI v3.0 • Digital Loyalty Pass",
      branch: "Branch",
      congratsTitle: "🎉 CONGRATULATIONS! YOU WON A REWARD!",
      congratsDesc: "Show this coupon code to the cashier to claim your reward:"
    },
    fr: {
      cardTitle: "CARTE DE FIDÉLITÉ DIGITALE",
      vipStatus: "MEMBRE VIP OR",
      stampsLabel: "Tampons Actuels",
      rewardGoal: "Cadeau à 10 Tampons :",
      addWallet: "📲 Ajouter à l'écran d'accueil (Add to Home Screen)",
      pwaInstruction: "Cliquez sur les options du navigateur ➔ 'Sur l'écran d'accueil' pour un accès direct !",
      scanBoxTitle: "Scan Rapide Caisse (1D + 2D)",
      qrInstruction: "Présentez cet écran en caisse lors du paiement pour cumuler vos tampons",
      poweredBy: "Smart Review AI v3.0 • Pass Fidélité VIP",
      branch: "Branche",
      congratsTitle: "🎉 FÉLICITATIONS ! VOUS AVEZ GAGNÉ UN CADEAU !",
      congratsDesc: "Présentez ce code coupon en caisse pour retirer votre cadeau immédiatement :"
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
      <div className="fixed top-[-10%] right-[-10%] w-96 h-96 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-96 h-96 bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-md mx-auto w-full space-y-5 relative z-10 my-auto">
        
        {/* HEADER DE LA CARTE */}
        <header className="flex justify-between items-center pt-1 px-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">
              {t.vipStatus}
            </span>
          </div>

          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-amber-500/20 text-xs font-black text-zinc-200 hover:text-amber-400 backdrop-blur-xl transition-all"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            {lang === 'ar' ? 'Français' : lang === 'fr' ? 'English' : 'العربية'}
          </button>
        </header>

        {/* BANNIÈRE DORÉE : CADEAU VIP DÉBLOQUÉ (STATUS PENDING) */}
        {pendingCoupon && (
          <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-zinc-950 p-5 rounded-2xl shadow-[0_0_35px_rgba(245,158,11,0.7)] space-y-2 border-2 border-amber-200 animate-pulse">
            <div className="flex items-center gap-2">
              <PartyPopper className="w-7 h-7 text-zinc-950 shrink-0" />
              <h2 className="text-base font-black leading-tight">{t.congratsTitle}</h2>
            </div>
            <p className="text-xs font-bold opacity-90">{t.congratsDesc}</p>
            <div className="bg-zinc-950 text-amber-400 p-3 rounded-xl flex items-center justify-between border border-amber-300/40 mt-2">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="text-sm font-black">{pendingCoupon.prize_won || restaurantData.loyalty_reward}</span>
              </div>
              <span className="font-mono text-xs font-black bg-amber-500 text-zinc-950 px-2.5 py-1 rounded shadow">
                {pendingCoupon.coupon_code || memberID}
              </span>
            </div>
          </div>
        )}

        {/* CARTE 3D GLASSMORPHISM LUXURY */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 via-amber-300 to-emerald-500 rounded-[28px] blur-sm opacity-70"></div>

          <div className="relative bg-[#14161F] border-2 border-amber-400/40 backdrop-blur-2xl rounded-[26px] p-6 space-y-5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden">
            
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-white/10 via-transparent to-transparent pointer-events-none" />

            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <div>
                <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">{t.cardTitle}</p>
                <h1 className="text-2xl font-black text-white">{restaurantData.restaurant_name}</h1>
                <p className="text-xs text-zinc-400 font-bold">{t.branch} {restaurantData.city}</p>
              </div>

              <div className="w-11 h-8 bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 rounded-md border border-amber-200/50 shadow-inner flex items-center justify-center relative overflow-hidden shrink-0">
                <Cpu className="w-6 h-6 text-amber-950/70 opacity-80" />
                <div className="absolute inset-0 bg-white/20 transform -skew-x-12" />
              </div>
            </div>

            {/* GRILLE DE TAMPONS DYNAMIQUES */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-zinc-300">{t.stampsLabel}</span>
                <span className="text-amber-400 font-mono text-sm px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                  {stampsCount} / {maxStamps}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2.5 pt-1">
                {Array.from({ length: maxStamps }).map((_, idx) => {
                  const isFilled = idx < stampsCount;
                  return (
                    <div
                      key={idx}
                      className={`h-12 rounded-xl border flex items-center justify-center transition-all duration-300 ${
                        isFilled
                          ? 'bg-gradient-to-br from-amber-400 to-amber-600 border-amber-300 text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-105'
                          : 'bg-zinc-950/80 border-zinc-800 text-zinc-700'
                      }`}
                    >
                      {isFilled ? (
                        <Check className="w-6 h-6 stroke-[3]" />
                      ) : (
                        <span className="text-xs font-mono font-bold">{idx + 1}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PROGRESSION & RÉCOMPENSE */}
            <div className="space-y-2.5 pt-2 border-t border-white/10">
              <div className="w-full bg-zinc-950 rounded-full h-2.5 overflow-hidden border border-zinc-800 p-0.5">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-300">
                <Gift className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="leading-snug">{t.rewardGoal} {restaurantData.loyalty_reward}</span>
              </div>
            </div>

            {/* ZONE DE SCAN ultra-haute visibilité */}
            <div className="bg-white text-black p-4 rounded-2xl shadow-xl space-y-3 border-2 border-amber-400/80">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <div className="flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-zinc-900" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-zinc-900">
                    {t.scanBoxTitle}
                  </span>
                </div>
                <span className="font-mono text-xs font-black bg-zinc-900 text-amber-400 px-2 py-0.5 rounded">
                  {memberID}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="w-20 h-20 bg-white p-1 rounded-lg border border-zinc-300 shrink-0 flex items-center justify-center">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(memberID)}`} 
                    alt="QR Code Client"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
                  <Code128Barcode text={memberID} />
                  <p className="font-mono text-[10px] font-bold text-zinc-800 tracking-[0.2em] mt-1">
                    *{memberID}*
                  </p>
                </div>
              </div>

              <p className="text-[10px] text-zinc-600 font-bold text-center leading-tight pt-1 border-t border-zinc-100">
                {t.qrInstruction}
              </p>
            </div>

          </div>
        </div>

        {/* GUIDANCE PWA */}
        <div className="bg-zinc-900/90 border border-white/10 p-3.5 rounded-2xl text-center space-y-1 backdrop-blur-xl">
          <p className="text-xs font-bold text-amber-400 flex items-center justify-center gap-1">
            <Smartphone className="w-4 h-4" />
            {t.addWallet}
          </p>
          <p className="text-[10px] text-zinc-400">{t.pwaInstruction}</p>
        </div>

        {/* FOOTER */}
        <footer className="pt-2 text-center">
          <p className="text-[11px] text-zinc-500 font-bold tracking-wider flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            {t.poweredBy}
          </p>
        </footer>

      </div>
    </div>
  );
}
