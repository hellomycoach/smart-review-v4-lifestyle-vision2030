'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  CheckCircle2, Clock, ChefHat, Sparkles, Gift, CreditCard, 
  ArrowRight, ArrowLeft, RotateCcw, Award, Utensils, Receipt, 
  Smartphone, Share2, Download, Printer, MessageCircle, X, FileText, QrCode
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
  const [orderStatusIndex, setOrderStatusIndex] = useState(0); // 0: Reçue, 1: En cuisine, 2: Prête, 3: Servie
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Convertir le statut texte en index d'étape
  const getIndexFromStatus = (st: string) => {
    switch (st) {
      case 'recue': return 0;
      case 'en_cuisine': return 1;
      case 'prete': return 2;
      case 'servie': return 3;
      default: return 0;
    }
  };

  // Auto-langue & chargement initial de commande
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
          if (parsed.status) {
            setOrderStatusIndex(getIndexFromStatus(parsed.status));
          }
        } catch (e) {}
      }

      // Synchronisation Cloud multi-appareils (Polling toutes les 3 secondes)
      const checkOrderStatus = async () => {
        try {
          const res = await fetch(`/api/orders?orderId=${orderId}&t=${Date.now()}`);
          if (!res.ok) return;
          const data = await res.json();
          if (data.success && data.order && data.order.status) {
            setOrderStatusIndex(getIndexFromStatus(data.order.status));
            setOrderData((prev: any) => ({ ...prev, ...data.order }));
          }
        } catch (e) {}
      };

      checkOrderStatus();
      const interval = setInterval(checkOrderStatus, 3000);

      // Synchronisation en direct avec le Dashboard Cuisine KDS (BroadcastChannel sur même appareil)
      let channel: BroadcastChannel | null = null;
      try {
        channel = new BroadcastChannel('sr_order_sync');
        channel.onmessage = (event) => {
          if (event.data?.type === 'STATUS_UPDATE' && event.data?.status) {
            if (!event.data.orderId || event.data.orderId === orderId) {
              setOrderStatusIndex(getIndexFromStatus(event.data.status));
              setOrderData((prev: any) => prev ? { ...prev, status: event.data.status } : prev);
            }
          }
        };
      } catch (e) {}

      // Écouter les modifications de localStorage
      const handleStorage = (e: StorageEvent) => {
        if (e.key === 'sr_last_order' && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            if (parsed.status) {
              setOrderStatusIndex(getIndexFromStatus(parsed.status));
              setOrderData(parsed);
            }
          } catch (err) {}
        }
      };
      window.addEventListener('storage', handleStorage);

      return () => {
        clearInterval(interval);
        if (channel) channel.close();
        window.removeEventListener('storage', handleStorage);
      };
    }
  }, [orderId]);

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
      loyaltyButton: "عرض بطاقة الولاء الرقمية",
      orderAgain: "طلب أطباق أخرى",
      downloadInvoice: "تحميل الفاتورة الإلكترونية (PDF)",
      whatsappTrack: "متابعة الطلب عبر واتساب",
      currency: orderData?.currency === "EUR" ? "€" : (orderData?.currency === "SAR" ? "ر.س" : "ر.ق"),
    },
    fr: {
      successTitle: "Commande Validée avec Succès !",
      successSub: "Merci pour votre visite. Vos plats sont en cours de préparation en cuisine.",
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
      downloadInvoice: "Télécharger la Facture PDF",
      whatsappTrack: "Recevoir le suivi sur WhatsApp",
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
      downloadInvoice: "Download PDF Tax Invoice",
      whatsappTrack: "Get updates on WhatsApp",
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
                        ? 'bg-[#3D352E] text-[#FAF8F5] ring-4 ring-[#EAE0D5] scale-110 shadow-md' 
                        : 'bg-[#E0D5C7] text-[#8C7A6B]'
                    } ${isCurrent ? 'animate-bounce' : ''}`}>
                      {idx === 0 && <Receipt className="w-3.5 h-3.5" />}
                      {idx === 1 && <ChefHat className="w-3.5 h-3.5 text-[#C5A880]" />}
                      {idx === 2 && <Clock className="w-3.5 h-3.5 text-[#C5A880]" />}
                      {idx === 3 && <Utensils className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <span className={`text-[11px] font-bold mt-2 ${isPassed ? 'text-[#3D352E]' : 'text-[#A8988B]'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="text-[11px] font-semibold text-[#8C6D48] flex items-center justify-center gap-1.5 pt-2">
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

        {/* DÉTAIL DU REÇU DIGITAL & FACTURE ÉLECTRONIQUE */}
        {orderData && orderData.items && (
          <div className="bg-[#FAF8F5] rounded-3xl p-5 border border-[#E5DAD0] shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5DAD0]">
              <h3 className="font-bold text-sm text-[#3D352E] flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#8C6D48]" />
                <span>{t.receiptTitle}</span>
              </h3>
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#3D352E] hover:bg-[#241E1A] text-[#FAF8F5] font-bold text-xs shadow-sm transition-all active:scale-95"
              >
                <FileText className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>{t.downloadInvoice}</span>
              </button>
            </div>

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

            {/* BOUTON WHATSAPP INBOUND SÉCURISÉ (ANTI-BAN) */}
            <a
              href={`https://wa.me/41779051014?text=${encodeURIComponent(
                isRTL 
                  ? `مرحباً ${orderData?.restaurant_name || formattedUrlName}، هذه طلبيتي #${orderId} للطاولة رقم ${tableNumber}`
                  : (lang === 'fr' 
                    ? `Bonjour ${orderData?.restaurant_name || formattedUrlName}, voici ma commande #${orderId} pour la table ${tableNumber}`
                    : `Hello ${orderData?.restaurant_name || formattedUrlName}, here is my order #${orderId} for table ${tableNumber}`)
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-2xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] font-black text-xs border border-[#25D366]/30 transition-all active:scale-98"
            >
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
              <span>{t.whatsappTrack}</span>
            </a>
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

      {/* MODAL FACTURE FISCALE OFFICIELLE PDF A4 */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white text-black rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 my-8 border border-gray-200">
            
            {/* Bouton de fermeture */}
            <button
              onClick={() => setShowInvoiceModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors print:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            {/* DOCUMENT IMPRIMABLE A4 */}
            <div id="printable-invoice" className="space-y-6 bg-white text-black p-2">
              
              {/* En-tête Facture */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-black pb-4">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-gray-500 font-black">
                    Facture Électronique Simplifiée / Simplified Tax Invoice
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-gray-950 mt-1">
                    {orderData?.restaurant_name || formattedUrlName}
                  </h2>
                  <p className="text-xs text-gray-600 mt-0.5">Doha, Qatar • Tél : +974 4400 0000</p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-gray-500">FACTURE N°</div>
                  <div className="text-lg font-black font-mono text-gray-900">{orderId}</div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    {new Date(orderData?.timestamp || Date.now()).toLocaleDateString(lang === 'ar' ? 'ar-QA' : 'fr-FR', {
                      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>

              {/* Infos Client & Table */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-gray-50 rounded-xl text-xs border border-gray-200">
                <div>
                  <span className="text-gray-500 block text-[10px] font-bold">TABLE</span>
                  <span className="font-black text-gray-900 text-sm">#{tableNumber}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] font-bold">CLIENT</span>
                  <span className="font-bold text-gray-900">{orderData?.customer_name || 'Guest'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] font-bold">MODE DE RÈGLEMENT</span>
                  <span className="font-bold text-gray-900">
                    {orderData?.payment_method === 'apple_pay' ? 'Apple Pay' : (orderData?.payment_method === 'card' ? 'Carte Bancaire (NAPS)' : 'Règlement en caisse')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] font-bold">STATUT PAIEMENT</span>
                  <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block text-[11px]">
                    Confirmé / Validé
                  </span>
                </div>
              </div>

              {/* Tableau des Articles */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left divide-y divide-gray-200">
                  <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Désignation / Item</th>
                      <th className="p-3 text-center">Qté</th>
                      <th className="p-3 text-right">Prix Unit.</th>
                      <th className="p-3 text-right">Total ({t.currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {(orderData?.items || []).map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-bold text-gray-900">{item.name}</div>
                          {item.options && item.options.length > 0 && (
                            <div className="text-[10px] text-gray-500">{item.options.join(', ')}</div>
                          )}
                        </td>
                        <td className="p-3 text-center font-bold text-gray-800">{item.quantity}</td>
                        <td className="p-3 text-right text-gray-600">{(item.price / (item.quantity || 1)).toFixed(2)}</td>
                        <td className="p-3 text-right font-bold text-gray-900">{item.price?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totaux & Ventilation Taxes */}
              <div className="flex flex-wrap justify-between items-end gap-4 pt-2 border-t border-gray-200">
                <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="w-16 h-16 bg-gray-900 text-white flex items-center justify-center rounded-lg p-1">
                    <QrCode className="w-14 h-14" />
                  </div>
                  <div className="text-[10px] text-gray-500 max-w-[160px] leading-tight">
                    Facture certifiée conforme E-Invoicing Qatar & Vision 2030 Smart Review.
                  </div>
                </div>

                <div className="w-full sm:w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Sous-total HT :</span>
                    <span>{orderData?.subtotal?.toFixed(2)} {t.currency}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>TVA (0% - Qatar) :</span>
                    <span>0.00 {t.currency}</span>
                  </div>
                  {orderData?.tip > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Pourboire de service :</span>
                      <span>+{orderData?.tip?.toFixed(2)} {t.currency}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-gray-950 pt-2 border-t-2 border-black">
                    <span>TOTAL TTC :</span>
                    <span>{orderData?.total_amount?.toFixed(2)} {t.currency}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Barre d'action Modal (Télécharger / Imprimer) */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-gray-200 print:hidden">
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-xs transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={() => typeof window !== 'undefined' && window.print()}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-950 hover:bg-gray-800 text-white font-black text-xs shadow-lg transition-transform active:scale-95"
              >
                <Printer className="w-4 h-4 text-[#C5A880]" />
                <span>Imprimer / Télécharger en PDF</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Style Print pour Document PDF Pro A4 */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-invoice, #printable-invoice * {
            visibility: visible;
          }
          #printable-invoice {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 30px;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}
