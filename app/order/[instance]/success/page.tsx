'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  CheckCircle2, Clock, ChefHat, Sparkles, Gift, CreditCard, 
  ArrowRight, ArrowLeft, RotateCcw, Award, Utensils, Receipt, 
  Smartphone, Share2
} from 'lucide-react';

export default function OrderSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Langue
  const [lang, setLang] = useState<'ar' | 'fr' | 'en'>('ar');
  const isRTL = lang === 'ar';

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

  const orderId = searchParams.get('orderId') || 'SR-928471';
  const tableNumber = searchParams.get('table') || '01';

  const [orderData, setOrderData] = useState<any>(null);
  const [orderStatusIndex, setOrderStatusIndex] = useState(1); // 0: Reçue, 1: En cuisine, 2: Prête, 3: Servie

  // Auto-langue & chargement de commande
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userLang = (navigator.language || 'ar').toLowerCase();
      if (userLang.startsWith('fr')) setLang('fr');
      else if (userLang.startsWith('en')) setLang('en');
      else setLang('ar');

      const saved = localStorage.getItem('sr_last_order');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setOrderData(parsed);
        } catch (e) {}
      }
    }
  }, []);

  // Simulation vivante de l'avancement en cuisine
  useEffect(() => {
    const t1 = setTimeout(() => setOrderStatusIndex(1), 3000);
    const t2 = setTimeout(() => setOrderStatusIndex(2), 12000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const t = {
    ar: {
      successTitle: "تم استلام طلبكم بنجاح!",
      successSub: "شكراً لزيارتكم. طلبكم قيد التحضير الآن بأعلى معايير الجودة.",
      orderNumber: "رقم الطلب",
      table: "طاولة",
      steps: [
        { label: "تم الاستلام", sub: "تم تأكيد الطلب" },
        { label: "في المطبخ", sub: "الشيف يحضر طلبك" },
        { label: "جاهز للتقديم", sub: "في طريقه لطاولتك" },
        { label: "تم التقديم", sub: "بالهناء والشفاء" }
      ],
      estimatedTime: "الوقت المقدر للتقديم : 12-15 دقيقة",
      receiptTitle: "تفاصيل الفاتورة الإلكترونية",
      subtotal: "المجموع الفرعي",
      tip: "الإكرامية",
      total: "المجموع المدفوع",
      paymentSuccess: "تم الدفع بنجاح عبر",
      spinPromoTitle: "🎁 اربح تحلية أو قهوة مجانية الآن!",
      spinPromoSub: "شاركنا تقييمك السريع على Google وادر عجلة الحظ للفوز بجوائز فورية.",
      spinButton: "تدوير عجلة الهدايا",
      loyaltyButton: "عرض بطاقة الولاء والنقاط",
      orderAgain: "طلب المزيد من الأطباق",
      currency: orderData?.currency === "EUR" ? "€" : (orderData?.currency === "SAR" ? "ر.س" : "ر.ق"),
    },
    fr: {
      successTitle: "Commande Confirmée avec Succès !",
      successSub: "Merci pour votre visite. Votre commande est en cours de préparation en cuisine.",
      orderNumber: "N° Commande",
      table: "Table",
      steps: [
        { label: "Reçue", sub: "Paiement validé" },
        { label: "En Cuisine", sub: "Le Chef prépare vos mets" },
        { label: "Prête", sub: "En cours de service" },
        { label: "Servie", sub: "Bonne dégustation !" }
      ],
      estimatedTime: "Temps estimé de service : 12-15 minutes",
      receiptTitle: "Reçu Digital & Détails",
      subtotal: "Sous-total",
      tip: "Pourboire",
      total: "Total Réglé",
      paymentSuccess: "Règlement confirmé via",
      spinPromoTitle: "🎁 Gagnez votre café ou dessert offert !",
      spinPromoSub: "Partagez votre avis Google en 1 clic et tentez votre chance à la roue des récompenses.",
      spinButton: "Faire tourner la roue cadeau",
      loyaltyButton: "Consulter ma carte fidélité",
      orderAgain: "Commander un autre plat",
      currency: orderData?.currency === "EUR" ? "€" : (orderData?.currency === "SAR" ? "SAR" : "QAR"),
    },
    en: {
      successTitle: "Order Placed Successfully!",
      successSub: "Thank you for joining us. Your dishes are being freshly prepared right now.",
      orderNumber: "Order #",
      table: "Table",
      steps: [
        { label: "Received", sub: "Payment verified" },
        { label: "Kitchen", sub: "Chef is preparing" },
        { label: "Ready", sub: "Heading to table" },
        { label: "Served", sub: "Bon appétit!" }
      ],
      estimatedTime: "Estimated service time: 12-15 minutes",
      receiptTitle: "Digital Receipt Summary",
      subtotal: "Subtotal",
      tip: "Tip",
      total: "Total Paid",
      paymentSuccess: "Payment confirmed via",
      spinPromoTitle: "🎁 Win a Free Dessert or Coffee!",
      spinPromoSub: "Leave a quick Google review and spin the VIP Wheel for immediate rewards.",
      spinButton: "Spin the Reward Wheel",
      loyaltyButton: "View Digital Loyalty Card",
      orderAgain: "Order more items",
      currency: orderData?.currency === "EUR" ? "€" : (orderData?.currency === "SAR" ? "SAR" : "QAR"),
    }
  }[lang];

  const userPhone = orderData?.customer_phone || (typeof window !== 'undefined' ? localStorage.getItem('user_phone') : '') || '';

  return (
    <div 
      dir={isRTL ? 'rtl' : 'ltr'} 
      className="min-h-screen bg-gradient-to-b from-[#FAF8F5] via-[#F4EFEA] to-[#EFE7DC] text-[#2E2722] font-sans antialiased p-4 py-8"
      style={{ fontFamily: "'Cairo', system-ui, -apple-system, sans-serif" }}
    >
      <div className="max-w-xl mx-auto space-y-6">

        {/* CARTE PRINCIPALE DE CONFIRMATION */}
        <div className="bg-[#FAF8F5] rounded-3xl p-6 md:p-8 border border-[#E5DAD0] shadow-xl text-center relative overflow-hidden">
          
          {/* Badge statut succès */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#3D352E] to-[#6E5D4F] text-[#FAF8F5] flex items-center justify-center mx-auto mb-4 shadow-lg ring-8 ring-[#EAE0D5]">
            <CheckCircle2 className="w-9 h-9 text-[#C5A880]" />
          </div>

          <h1 className="text-2xl font-black text-[#2E2722] mb-1">
            {t.successTitle}
          </h1>
          <p className="text-xs text-[#7A695B] max-w-sm mx-auto leading-relaxed mb-6">
            {t.successSub}
          </p>

          {/* Numéro de commande & Table */}
          <div className="grid grid-cols-2 gap-3 p-4 bg-[#F3ECE2] rounded-2xl border border-[#E0D5C7] mb-6">
            <div>
              <div className="text-[11px] text-[#8C7A6B] font-bold">{t.orderNumber}</div>
              <div className="text-base font-black text-[#3D352E]">{orderId}</div>
            </div>
            <div>
              <div className="text-[11px] text-[#8C7A6B] font-bold">{t.table}</div>
              <div className="text-base font-black text-[#8C6D48]">#{tableNumber}</div>
            </div>
          </div>

          {/* SUIVI DE STATUT EN DIRECT (STEPPER) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between relative">
              {/* Ligne de connexion */}
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-[#E0D5C7] -translate-y-1/2 z-0"></div>
              <div 
                className="absolute top-1/2 left-0 h-1 bg-[#C5A880] -translate-y-1/2 z-0 transition-all duration-500"
                style={{ width: `${(orderStatusIndex / 3) * 100}%` }}
              ></div>

              {t.steps.map((step, idx) => {
                const isPassed = idx <= orderStatusIndex;
                const isCurrent = idx === orderStatusIndex;
                return (
                  <div key={idx} className="relative z-10 flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                      isPassed 
                        ? 'bg-[#3D352E] text-[#FAF8F5] ring-4 ring-[#EAE0D5]' 
                        : 'bg-[#EAE0D5] text-[#8C7A6B]'
                    } ${isCurrent ? 'scale-110 shadow-md' : ''}`}>
                      {idx === 0 && <Receipt className="w-3.5 h-3.5" />}
                      {idx === 1 && <ChefHat className="w-3.5 h-3.5" />}
                      {idx === 2 && <Clock className="w-3.5 h-3.5" />}
                      {idx === 3 && <Utensils className="w-3.5 h-3.5" />}
                    </div>
                    <span className={`text-[10px] font-bold mt-2 ${isPassed ? 'text-[#3D352E]' : 'text-[#8C7A6B]'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="text-xs font-semibold text-[#8C6D48] flex items-center justify-center gap-1.5 pt-2">
              <Clock className="w-3.5 h-3.5" />
              <span>{t.estimatedTime}</span>
            </div>
          </div>

        </div>

        {/* PASSERELLE VERS LA ROUE DES AVIS (SPIN REWARDS) */}
        <div className="bg-gradient-to-br from-[#3D352E] to-[#241E1A] text-white rounded-3xl p-6 shadow-xl border border-[#5C4D41] relative overflow-hidden">
          <div className="absolute top-0 right-0 translate-x-4 -translate-y-4 w-32 h-32 bg-[#C5A880]/20 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="relative z-10 space-y-4 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C5A880]/20 text-[#DFCDBF] text-[11px] font-black border border-[#C5A880]/30">
              <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>{(orderData?.restaurant_name || formattedUrlName)} VIP</span>
            </div>

            <h3 className="text-lg md:text-xl font-black text-[#FAF8F5]">
              {t.spinPromoTitle}
            </h3>
            <p className="text-xs text-[#DFCDBF] leading-relaxed max-w-md mx-auto">
              {t.spinPromoSub}
            </p>

            <Link
              href={`/spin/${rawInstance}${userPhone ? `?phone=${userPhone}` : ''}`}
              className="inline-flex items-center justify-center gap-2 w-full py-4 px-6 rounded-2xl bg-[#C5A880] hover:bg-[#B3956E] text-[#241E1A] font-black text-sm shadow-lg transition-transform active:scale-98"
            >
              <Gift className="w-4 h-4" />
              <span>{t.spinButton}</span>
              {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </Link>
          </div>
        </div>

        {/* DÉTAIL DU REÇU DIGITAL */}
        {orderData && orderData.items && (
          <div className="bg-[#FAF8F5] rounded-3xl p-5 border border-[#E5DAD0] shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-[#3D352E] flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#8C6D48]" />
              <span>{t.receiptTitle}</span>
            </h3>

            <div className="divide-y divide-[#EFE8DF] text-xs">
              {orderData.items.map((it: any, i: number) => (
                <div key={i} className="py-2 flex justify-between items-start">
                  <div>
                    <span className="font-bold text-[#2E2722]">{it.quantity}x {it.name}</span>
                    {it.options && it.options.length > 0 && (
                      <div className="text-[10px] text-[#7A695B]">
                        {it.options.join(', ')}
                      </div>
                    )}
                  </div>
                  <span className="font-semibold text-[#3D352E]">
                    {it.price?.toFixed(2)} {t.currency}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#E5DAD0] space-y-1 text-xs">
              <div className="flex justify-between text-[#7A695B]">
                <span>{t.subtotal}</span>
                <span>{orderData.subtotal?.toFixed(2)} {t.currency}</span>
              </div>
              {orderData.tip > 0 && (
                <div className="flex justify-between text-[#7A695B]">
                  <span>{t.tip}</span>
                  <span>+{orderData.tip?.toFixed(2)} {t.currency}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-[#2E2722] pt-1">
                <span>{t.total}</span>
                <span className="text-base text-[#8C6D48]">{orderData.total_amount?.toFixed(2)} {t.currency}</span>
              </div>
            </div>
          </div>
        )}

        {/* ACTIONS SECONDAIRES (CARTE FIDÉLITÉ & NOUVELLE COMMANDE) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {userPhone && (
            <Link
              href={`/card/${userPhone}`}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#EAE0D5] hover:bg-[#DFCDBF] text-[#4A3D34] font-bold text-xs border border-[#D5C4B4] transition-colors"
            >
              <Award className="w-4 h-4 text-[#8C6D48]" />
              <span>{t.loyaltyButton}</span>
            </Link>
          )}

          <Link
            href={`/order/${rawInstance}?table=${tableNumber}`}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#FAF8F5] hover:bg-[#F3ECE2] text-[#3D352E] font-bold text-xs border border-[#E5DAD0] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t.orderAgain}</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
