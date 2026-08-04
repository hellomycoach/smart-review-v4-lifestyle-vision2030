'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Award, CheckCircle, Phone, RefreshCw, Gift, AlertTriangle } from 'lucide-react';

const N8N_STAMP_API = "https://n8n.srv821341.hstgr.cloud/webhook/whatsapp-incoming-v3";
const N8N_RESTAURANTS_API = "https://n8n.srv821341.hstgr.cloud/webhook/get-restaurants-v3";

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

export default function CashierStampPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [stampResult, setStampResult] = useState<any>(null);

  let currentInstance = "";
  if (typeof window !== 'undefined') {
    const parts = window.location.pathname.split('/cashier/');
    if (parts.length > 1) {
      currentInstance = parts[1].split('/')[0].split('?')[0].trim().toLowerCase();
    }
  }
  if (!currentInstance && params?.instance) {
    currentInstance = (typeof params.instance === 'string' ? params.instance : '').trim().toLowerCase();
  }

  const formattedUrlName = currentInstance
    ? currentInstance.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : "Cashier Stamp";

  const [restaurantData, setRestaurantData] = useState<any>({
    restaurant_name: formattedUrlName,
    loyalty_reward: ""
  });

  // Charger le nom du restaurant et du cadeau depuis NocoDB
  useEffect(() => {
    const loadRest = async () => {
      try {
        const res = await fetch(`${N8N_RESTAURANTS_API}?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.list || data.data || []);
          const matched = list.find((r: any) => {
            const inst = parseInstanceName(r.instance_name || r.restaurant_name).toLowerCase();
            return currentInstance ? (inst === currentInstance || inst.includes(currentInstance) || currentInstance.includes(inst)) : true;
          });

          if (matched) {
            setRestaurantData({
              restaurant_name: matched.restaurant_name || formattedUrlName,
              loyalty_reward: matched.loyalty_reward || matched.reward_offer || ""
            });
          }
        }
      } catch (e) {}
    };
    if (currentInstance) loadRest();
  }, [currentInstance]);

  // Pré-remplissage si scan QR Code (?phone=33767803233)
  useEffect(() => {
    const urlPhone = searchParams.get('phone');
    if (urlPhone) {
      setPhone(urlPhone.replace(/[^0-9]/g, ''));
    }
  }, [searchParams]);

  const handleAddStamp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);

    try {
      const res = await fetch(N8N_STAMP_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instance: currentInstance,
          isCashier: true,
          data: {
            key: { remoteJid: `${phone.trim()}@s.whatsapp.net` },
            message: { conversation: "Tampon du jour" }
          }
        }),
      });

      if (res.ok) {
        const rawData = await res.json();
        // DÉPAQUETAGE DU TABLEAU RETURNÉ PAR N8N
        const dataItem = Array.isArray(rawData) ? rawData[0] : rawData;
        const cleanData = (dataItem && dataItem.json) ? dataItem.json : dataItem;
        
        setStampResult(cleanData);
      } else {
        setStampResult({ success: false, notRegistered: true });
      }

      setTimeout(() => {
        setStampResult(null);
        setPhone('');
      }, 6000);
    } catch (err) {
      setStampResult({ success: false, notRegistered: true });
      setTimeout(() => {
        setStampResult(null);
        setPhone('');
      }, 6000);
    } finally {
      setLoading(false);
    }
  };

  // DÉTECTION SÉCURISÉE DU STATUT "CLIENT NON INSCRIT"
  const isNotRegistered = stampResult && (
    stampResult.notRegistered === true || 
    stampResult.success === false || 
    stampResult.notRegistered === "true"
  );

  const isWinner = stampResult && (
    stampResult.isVIPWinner === true || 
    stampResult.isVIPWinner === "true"
  );

  return (
    <div dir="rtl" className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4 font-['Cairo']">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full space-y-6 shadow-2xl text-center relative overflow-hidden">
        
        <div className="inline-flex p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-3xl">
          <Award className="w-10 h-10" />
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-black text-amber-500">{restaurantData.restaurant_name || "Halim Cafe"}</h1>
          <p className="text-xs text-zinc-400">إضافة ختم الولاء • Cashier Stamp System</p>
        </div>

        {/* AFFICHAGE DU RÉSULTAT DU TAMPON */}
        {stampResult ? (
          /* CAS A : CLIENT NON INSCRIT (STRATÉGIE A) */
          isNotRegistered ? (
            <div className="bg-rose-500/10 border-2 border-rose-500 p-6 rounded-3xl space-y-3 shadow-[0_0_30px_rgba(244,63,94,0.3)] animate-pulse">
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl w-fit mx-auto border border-rose-500/40">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <p className="text-sm font-black text-rose-400 uppercase tracking-wider">
                ⚠️ العميل غير مسجل / CLIENT NON INSCRIT
              </p>
              <p className="text-xs text-zinc-300 font-bold leading-relaxed">
                الرجاء دعوة العميل لمسح رمز QR لترك تقييم وتفعيل بطاقته!
                <br />
                <span className="text-zinc-400">Veuillez inviter le client à scanner le QR Code à sa table pour laisser un avis et débloquer sa carte VIP !</span>
              </p>
            </div>
          ) : isWinner ? (
            /* CAS B : BANNER DORÉ 10È TAMPON */
            <div className="bg-gradient-to-r from-amber-500/20 via-amber-400/20 to-amber-500/20 border-2 border-amber-400 p-6 rounded-3xl space-y-3 shadow-[0_0_50px_rgba(245,158,11,0.4)] animate-pulse">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl w-fit mx-auto border border-amber-500/40">
                <Gift className="w-8 h-8" />
              </div>
              <p className="text-sm font-black text-amber-300 uppercase tracking-wider">🎉 هدية الفائز VIP / FREE REWARD!</p>
              <h2 className="text-2xl font-black text-white">{restaurantData.loyalty_reward || "Cadeau VIP"}</h2>
              <p className="text-xs text-zinc-300 font-bold">قدم هذا الكادوه للعميل الآن! / Give this reward to the customer now!</p>
            </div>
          ) : (
            /* CAS C : TAMPON NORMAL RÉUSSI */
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-2xl space-y-2 animate-bounce">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
              <p className="text-sm font-black text-emerald-300">تم إضافة الختم بنجاح! 🎉</p>
              <p className="text-xs text-zinc-400">تم تحديث بطاقة العميل على واتساب</p>
            </div>
          )
        ) : (
          <form onSubmit={handleAddStamp} className="space-y-4">
            <div className="space-y-1 text-start">
              <label className="text-xs text-zinc-400 font-bold">رقم واتساب العميل / Customer Phone</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-zinc-500 absolute right-3 top-3.5" />
                <input
                  type="tel"
                  required
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="966 50 000 0000"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pr-10 pl-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-amber-500 text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-sm py-4 rounded-xl transition shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : "إضافة الختم الآن +1 Stamp"}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
