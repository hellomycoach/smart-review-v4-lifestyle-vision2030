'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  QrCode, Download, Printer, ArrowLeft, Check, Sparkles, 
  Layers, Sliders, Image as ImageIcon, Coffee, RefreshCw,
  ExternalLink, Eye, Smartphone, ShieldCheck
} from 'lucide-react';
import QRCode from 'qrcode';
import JSZip from 'jszip';

export default function TableQrGeneratorPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const paramInst = typeof params?.instance === 'string' ? params.instance : (searchParams.get('instance') || '');
  let rawInstance = paramInst.trim().toLowerCase();
  if (typeof window !== 'undefined' && !rawInstance) {
    const parts = window.location.pathname.split('/qr-generator/');
    if (parts.length > 1) {
      rawInstance = parts[1].split('/')[0].split('?')[0].trim().toLowerCase();
    }
  }
  if (!rawInstance) rawInstance = "bos_cafe_moq";

  // Configuration du restaurant
  const [restaurantName, setRestaurantName] = useState("Bo's Coffee");
  const [primaryColor, setPrimaryColor] = useState("#3D271D"); // Teinte brun torréfié Bo's
  const [accentColor, setAccentColor] = useState("#C5A880"); // Teinte crème dorée Bo's
  const [tableCount, setTableCount] = useState<number>(20);
  const [tablePrefix, setTablePrefix] = useState<string>("Table");
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrCodes, setQrCodes] = useState<{ tableNumber: string; url: string; dataUrl: string }[]>([]);
  const [selectedPreviewTable, setSelectedPreviewTable] = useState<string>("01");
  const [activeFormat, setActiveFormat] = useState<'stand' | 'sticker'>('stand');

  // Chargement des données du restaurant
  useEffect(() => {
    const loadRestaurant = async () => {
      try {
        const res = await fetch(`/api/menu?instance=${rawInstance}`);
        if (res.ok) {
          const data = await res.json();
          if (data.restaurant) {
            setRestaurantName(data.restaurant.name || "Bo's Coffee");
            if (data.restaurant.primary_color) setPrimaryColor(data.restaurant.primary_color);
            if (data.restaurant.total_tables) setTableCount(Number(data.restaurant.total_tables) || 20);
          }
        }
      } catch (e) {}
    };
    loadRestaurant();
  }, [rawInstance]);

  // Génération automatique des QR Codes en haute définition
  useEffect(() => {
    const generateAllQrs = async () => {
      setIsGenerating(true);
      const generated: { tableNumber: string; url: string; dataUrl: string }[] = [];
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://smart-review-v4-lifestyle-vision2030.jdaproai.com';

      for (let i = 1; i <= tableCount; i++) {
        const tableStr = i < 10 ? `0${i}` : `${i}`;
        const orderUrl = `${origin}/order/${rawInstance}?table=${tableStr}`;

        try {
          // Création du QR Code en haute résolution (avec correction d'erreur élevée 'H')
          const dataUrl = await QRCode.toDataURL(orderUrl, {
            width: 800,
            margin: 2,
            color: {
              dark: primaryColor || '#3D271D',
              light: '#FFFFFF'
            },
            errorCorrectionLevel: 'H'
          });

          generated.push({
            tableNumber: tableStr,
            url: orderUrl,
            dataUrl
          });
        } catch (err) {
          console.error(`Erreur génération QR Table ${tableStr}:`, err);
        }
      }

      setQrCodes(generated);
      setIsGenerating(false);
    };

    generateAllQrs();
  }, [rawInstance, tableCount, primaryColor]);

  // Télécharger l'ensemble des QR Codes en archive ZIP
  const handleDownloadZip = async () => {
    if (qrCodes.length === 0) return;
    setIsGenerating(true);

    try {
      const zip = new JSZip();
      const folder = zip.folder(`QR_Codes_${rawInstance}`);

      qrCodes.forEach(item => {
        const base64Data = item.dataUrl.replace(/^data:image\/png;base64,/, "");
        folder?.file(`Table_${item.tableNumber}_${rawInstance}.png`, base64Data, { base64: true });
      });

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `QR_Codes_Tables_${rawInstance}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la création de l'archive ZIP");
    } finally {
      setIsGenerating(false);
    }
  };

  // Déclencher l'impression native du navigateur
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const previewItem = qrCodes.find(q => q.tableNumber === selectedPreviewTable) || qrCodes[0];

  return (
    <div className="min-h-screen bg-[#F7F4F0] text-[#2E2722] font-sans">
      
      {/* HEADER SUPÉRIEUR ÉLÉGANT (MASQUÉ À L'IMPRESSION) */}
      <div className="no-print bg-[#241E1A] text-white py-4 px-6 shadow-md border-b border-[#3D332A] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link 
              href={`/kitchen/${rawInstance}`}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5 text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour Cuisine</span>
            </Link>
            <div>
              <h1 className="text-base md:text-lg font-black flex items-center gap-2">
                <span>Générateur de Chevalets QR Code</span>
                <span className="text-[10px] bg-[#C5A880] text-[#1E1916] font-bold px-2 py-0.5 rounded-full">
                  Automatisé
                </span>
              </h1>
              <p className="text-xs text-[#A8988B]">{restaurantName} • Prêt pour impression</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadZip}
              disabled={isGenerating || qrCodes.length === 0}
              className="px-4 py-2.5 rounded-xl bg-[#C5A880] hover:bg-[#B3936A] text-[#1E1916] font-black text-xs shadow transition flex items-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Télécharger le Pack ZIP ({qrCodes.length} PNGs)</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-[#1E1916] font-black text-xs shadow transition flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer les Chevalets</span>
            </button>
          </div>
        </div>
      </div>

      {/* PANNEAU DE CONFIGURATION & PRÉVISUALISATION (MASQUÉ À L'IMPRESSION) */}
      <div className="no-print max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Colonne 1 : Paramètres du Restaurant */}
          <div className="bg-white rounded-3xl p-5 border border-[#E8DFD5] shadow-sm space-y-4">
            <h2 className="text-sm font-black flex items-center gap-2 text-[#2E2722]">
              <Sliders className="w-4 h-4 text-[#8C6D48]" />
              <span>Personnalisation Visuelle</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#5C4D41] block mb-1">Nombre de Tables</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="60"
                    value={tableCount}
                    onChange={(e) => setTableCount(Number(e.target.value))}
                    className="w-full accent-[#3D271D]"
                  />
                  <span className="font-mono font-black text-sm w-8 text-center">{tableCount}</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#5C4D41] block mb-1">Couleur Principale du QR</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-9 h-9 rounded-xl border-0 cursor-pointer p-0"
                  />
                  <span className="font-mono text-xs">{primaryColor}</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#5C4D41] block mb-1">Format de Support</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setActiveFormat('stand')}
                    className={`py-2 rounded-xl font-bold border transition ${
                      activeFormat === 'stand'
                        ? 'bg-[#3D271D] text-white border-[#3D271D]'
                        : 'bg-[#FAF8F5] text-[#5C4D41] border-[#E0D5C7]'
                    }`}
                  >
                    Chevalet A6 / Plexi
                  </button>
                  <button
                    onClick={() => setActiveFormat('sticker')}
                    className={`py-2 rounded-xl font-bold border transition ${
                      activeFormat === 'sticker'
                        ? 'bg-[#3D271D] text-white border-[#3D271D]'
                        : 'bg-[#FAF8F5] text-[#5C4D41] border-[#E0D5C7]'
                    }`}
                  >
                    Sticker Rond Table
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#5C4D41] block mb-1">Prévisualiser une Table</label>
                <select
                  value={selectedPreviewTable}
                  onChange={(e) => setSelectedPreviewTable(e.target.value)}
                  className="w-full p-2 rounded-xl bg-[#FAF8F5] border border-[#D5C4B4] font-bold text-xs"
                >
                  {qrCodes.map(q => (
                    <option key={q.tableNumber} value={q.tableNumber}>
                      Table {q.tableNumber}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-[#F0E8DE] text-[11px] text-[#7A695B] space-y-1">
              <p>✨ <strong>Astuce Pro :</strong> Les QR Codes intègrent la correction d'erreur maximale (30%), garantissant un scan ultra-rapide sous n'importe quel éclairage de salle.</p>
            </div>
          </div>

          {/* Colonne 2 & 3 : Prévisualisation en Direct du Chevalet de Table */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-[#E8DFD5] shadow-sm flex flex-col items-center justify-center">
            <span className="text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-[#8C6D48]" />
              <span>Aperçu Réel du Chevalet de Table (Table {selectedPreviewTable})</span>
            </span>

            {/* MODÈLE DU CHEVALET HAUTE DÉFINITION (FORMAT A6 PLEXIGLAS OU ADHÉSIF) */}
            {previewItem && (
              <div 
                className="w-full max-w-sm rounded-3xl border-2 border-[#E0D5C7] shadow-xl p-6 flex flex-col items-center text-center space-y-4 bg-gradient-to-b from-[#FAF8F5] via-[#FFF] to-[#FAF8F5] relative overflow-hidden"
                style={{ borderColor: accentColor }}
              >
                {/* Bandeau supérieur couleur restaurant */}
                <div 
                  className="absolute top-0 inset-x-0 h-3"
                  style={{ backgroundColor: primaryColor }}
                />

                {/* Nom & Logo du Restaurant */}
                <div className="pt-2">
                  <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-white shadow-md mb-2" style={{ backgroundColor: primaryColor }}>
                    <Coffee className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black tracking-wide text-[#2E2722]">
                    {restaurantName}
                  </h3>
                  <p className="text-[11px] text-[#8C7A6B] uppercase tracking-widest font-bold">
                    Mall of Qatar • Doha
                  </p>
                </div>

                {/* Badge Numéro de Table */}
                <div 
                  className="px-6 py-1.5 rounded-full font-black text-xs tracking-wider uppercase text-white shadow"
                  style={{ backgroundColor: primaryColor }}
                >
                  TABLE {previewItem.tableNumber}
                </div>

                {/* QR Code Haute Définition Généré */}
                <div className="p-3 bg-white rounded-2xl border border-[#E8DFD5] shadow-md">
                  <img
                    src={previewItem.dataUrl}
                    alt={`QR Code Table ${previewItem.tableNumber}`}
                    className="w-48 h-48 rounded-xl"
                  />
                </div>

                {/* Appel à l'action bilingue (Arabe & Anglais) */}
                <div className="space-y-1">
                  <p className="text-xs font-black text-[#2E2722]" dir="rtl">
                    امسح الكود واطلب من طاولتك مباشرة ☕
                  </p>
                  <p className="text-[11px] font-bold text-[#5C4D41]">
                    Scan QR Code to Order & Pay at Table
                  </p>
                </div>

                {/* Badges de Paiement Sécurisé */}
                <div className="pt-2 border-t border-[#F0E8DE] w-full flex items-center justify-center gap-3 text-[10px] font-black text-[#7A695B]">
                  <span className="flex items-center gap-1">
                    <span></span>
                    <span>Apple Pay</span>
                  </span>
                  <span>•</span>
                  <span>Google Pay</span>
                  <span>•</span>
                  <span>NAPS</span>
                </div>

              </div>
            )}

            <div className="mt-4 flex items-center gap-2">
              <a 
                href={previewItem?.url} 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-[#8C6D48] hover:underline flex items-center gap-1 font-bold"
              >
                <span>Tester le lien direct du QR Code</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

        </div>

      </div>

      {/* PLANCHE D'IMPRESSION COMPLÈTE (VISIBLE UNIQUEMENT LORS DU PRINT / IMPRIMER) */}
      <div className="print-only hidden print:block p-4">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            body { background: white !important; }
            @page { margin: 1cm; size: A4; }
          }
        `}} />

        <div className="grid grid-cols-2 gap-6">
          {qrCodes.map((item) => (
            <div 
              key={item.tableNumber}
              className="border-2 border-gray-300 rounded-3xl p-6 flex flex-col items-center text-center space-y-3 bg-white break-inside-avoid page-break"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}>
                <Coffee className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-black">{restaurantName}</h3>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Order & Pay System</p>
              </div>

              <div 
                className="px-5 py-1 rounded-full font-black text-xs text-white uppercase tracking-wider"
                style={{ backgroundColor: primaryColor }}
              >
                TABLE {item.tableNumber}
              </div>

              <img
                src={item.dataUrl}
                alt={`QR Code Table ${item.tableNumber}`}
                className="w-44 h-44"
              />

              <div className="space-y-0.5">
                <p className="text-xs font-black text-black" dir="rtl">
                  امسح الكود واطلب من طاولتك مباشرة
                </p>
                <p className="text-[11px] font-bold text-gray-600">
                  Scan to Order & Pay • No App Needed
                </p>
              </div>

              <div className="pt-2 border-t border-gray-200 w-full flex items-center justify-center gap-2 text-[9px] font-bold text-gray-500">
                <span>Apple Pay</span>
                <span>•</span>
                <span>Google Pay</span>
                <span>•</span>
                <span>NAPS / Cards</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
