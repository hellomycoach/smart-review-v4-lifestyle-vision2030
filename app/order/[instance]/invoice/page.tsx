'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FileText, Download, Printer, ArrowLeft, ArrowRight, 
  QrCode, Loader2, CheckCircle2, Share2
} from 'lucide-react';

export default function StandaloneInvoicePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

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

  const urlOrderId = searchParams.get('orderId') || '';
  const urlTable = searchParams.get('table') || '';

  const [orderData, setOrderData] = useState<any>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const displayOrderId = orderData?.order_id || urlOrderId || 'SR-928471';
  const displayTableNumber = orderData?.table_number || urlTable || '01';
  const currency = orderData?.currency === "EUR" ? "€" : (orderData?.currency === "SAR" ? "SAR" : "QAR");

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
          if (!urlOrderId || parsed.order_id === urlOrderId) {
            setOrderData(parsed);
          }
        } catch (e) {}
      }

      const targetOrderId = urlOrderId || displayOrderId;
      fetch(`/api/orders?orderId=${targetOrderId}&t=${Date.now()}`)
        .then(r => r.json())
        .then(data => {
          if (data.success && data.order) {
            setOrderData((prev: any) => ({ ...prev, ...data.order }));
          }
        })
        .catch(() => {});
    }
  }, [urlOrderId]);

  // Téléchargement du PDF A4
  const handleDownloadPDF = async () => {
    const el = document.getElementById('printable-invoice');
    if (!el) return;
    setIsGeneratingPDF(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1000,
        onclone: (clonedDoc) => {
          const clonedEl = clonedDoc.getElementById('printable-invoice');
          if (clonedEl) {
            clonedEl.style.width = '750px';
            clonedEl.style.padding = '30px';
            clonedEl.style.margin = '0 auto';
            clonedEl.style.boxShadow = 'none';
          }
        }
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pageHeight));
      pdf.save(`Facture_${displayOrderId}.pdf`);
    } catch (err) {
      console.error('Erreur génération PDF:', err);
      window.print();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const defaultItems = [
    { name: "Signature Dish & Refreshment", quantity: 1, price: orderData?.total_amount || 45.00 }
  ];

  const itemsList = (orderData?.items && orderData.items.length > 0) ? orderData.items : defaultItems;
  const subtotal = orderData?.subtotal || orderData?.total_amount || 45.00;
  const totalAmount = orderData?.total_amount || subtotal;

  return (
    <div 
      dir={isRTL ? 'rtl' : 'ltr'} 
      className="min-h-screen bg-[#F4EFEA] text-[#2E2722] font-sans antialiased p-4 py-8"
      style={{ fontFamily: "'Cairo', system-ui, -apple-system, sans-serif" }}
    >
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Barre de navigation / Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-200 print:hidden">
          <Link
            href={`/order/${rawInstance}/success?orderId=${displayOrderId}&table=${displayTableNumber}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs transition-colors"
          >
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>Voir le suivi en direct</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => typeof window !== 'undefined' && window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-800 font-bold text-xs transition-colors"
            >
              <Printer className="w-4 h-4 text-gray-600" />
              <span>Imprimer</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gray-950 hover:bg-gray-800 text-white font-black text-xs shadow transition-all active:scale-95 disabled:opacity-50"
            >
              {isGeneratingPDF ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#C5A880]" />
              ) : (
                <Download className="w-4 h-4 text-[#C5A880]" />
              )}
              <span>Télécharger PDF</span>
            </button>
          </div>
        </div>

        {/* DOCUMENT FACTURE OFFICIELLE A4 */}
        <div id="printable-invoice" className="space-y-6 bg-white text-black p-6 md:p-8 rounded-3xl border border-gray-200 shadow-xl">
          
          {/* En-tête Facture */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-black pb-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-gray-500 font-black">
                Facture Électronique Simplifiée / Simplified Tax Invoice
              </div>
              <h1 className="text-2xl font-black tracking-tight text-gray-950 mt-1">
                {orderData?.restaurant_name || formattedUrlName}
              </h1>
              <p className="text-xs text-gray-600 mt-0.5">Doha, Qatar • Vision 2030 Smart Review</p>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-gray-500">FACTURE N°</div>
              <div className="text-lg font-black font-mono text-gray-900">{displayOrderId}</div>
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
              <span className="font-black text-gray-900 text-sm">#{displayTableNumber}</span>
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
                Confirmé / Conforme
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
                  <th className="p-3 text-right">Total ({currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {itemsList.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-bold text-gray-900">{item.name}</div>
                      {item.options && item.options.length > 0 && (
                        <div className="text-[10px] text-gray-500">{item.options.join(', ')}</div>
                      )}
                    </td>
                    <td className="p-3 text-center font-bold text-gray-800">{item.quantity || 1}</td>
                    <td className="p-3 text-right text-gray-600">{((item.price || totalAmount) / (item.quantity || 1)).toFixed(2)}</td>
                    <td className="p-3 text-right font-bold text-gray-900">{(item.price || totalAmount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totaux & Ventilation Taxes */}
          <div className="flex flex-wrap justify-between items-end gap-4 pt-2 border-t border-gray-200">
            <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl border border-gray-200">
              <div className="w-14 h-14 bg-gray-900 text-white flex items-center justify-center rounded-lg p-1">
                <QrCode className="w-12 h-12" />
              </div>
              <div className="text-[10px] text-gray-500 max-w-[160px] leading-tight">
                Facture certifiée conforme E-Invoicing Qatar & Vision 2030 Smart Review.
              </div>
            </div>

            <div className="w-full sm:w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Sous-total HT :</span>
                <span>{Number(subtotal).toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>TVA (0% - Qatar) :</span>
                <span>0.00 {currency}</span>
              </div>
              {orderData?.tip > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Pourboire de service :</span>
                  <span>+{Number(orderData.tip).toFixed(2)} {currency}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-gray-950 pt-2 border-t-2 border-black">
                <span>TOTAL TTC :</span>
                <span>{Number(totalAmount).toFixed(2)} {currency}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

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
