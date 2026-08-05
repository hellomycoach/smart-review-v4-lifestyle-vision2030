'use client';

import React, { useState, useEffect } from 'react';
import { 
  Star, MessageSquare, AlertTriangle, Gift, Phone, CheckCircle, 
  Sun, Moon, Globe, RefreshCw, Check, LogOut, Lock, Mail, Eye, EyeOff,
  Users, Download, Wifi
} from 'lucide-react';

const N8N_REVIEWS_API = "https://n8n.srv821341.hstgr.cloud/webhook/dashboard-data-v2";
const N8N_LOGIN_API = "https://n8n.srv821341.hstgr.cloud/webhook/login-manager";
const N8N_RESTAURANTS_API = "https://n8n.srv821341.hstgr.cloud/webhook/get-restaurants-v2";
const N8N_UPDATE_REWARD_API = "https://n8n.srv821341.hstgr.cloud/webhook/update-reward-v2";
const N8N_LEADS_API = "https://n8n.srv821341.hstgr.cloud/webhook/get-leads-v2";

// Extraction propre des menus déroulants NocoDB
const parseInstanceName = (raw: any): string => {
  if (!raw) return "";
  if (typeof raw === 'string') return raw.trim();
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    if (typeof first === 'string') return first.trim();
    if (typeof first === 'object' && first !== null) {
      return (first.instance_name || first.restaurant_name || first.title || "").trim();
    }
  }
  if (typeof raw === 'object' && raw !== null) {
    return (raw.instance_name || raw.restaurant_name || "").trim();
  }
  return "";
};

// Comparateur souple de marque (ex: "bella_italia_ryadh" correspond à "bella_italia_riyadh")
const isInstanceMatch = (inst1: string, inst2: string): boolean => {
  const clean1 = parseInstanceName(inst1).toLowerCase().trim();
  const clean2 = parseInstanceName(inst2).toLowerCase().trim();
  if (!clean1 || !clean2) return true;
  if (clean1 === clean2) return true;

  // Comparer le premier mot-clé de la marque (ex: "bella")
  const key1 = clean1.split('_')[0];
  const key2 = clean2.split('_')[0];
  if (key1 && key2 && key1.length >= 3 && key1 === key2) return true;

  return clean1.includes(clean2) || clean2.includes(clean1);
};

// Affiche google_review_text OU transcription
const getReviewText = (rev: any): string => {
  const gText = rev.google_review_text?.trim();
  const tText = rev.transcription?.trim();

  if (gText && gText.length > 0) return gText;
  if (tText && tText.length > 0) return tText;

  return "شكوَى من العميل (ملاحظة صوتية) / Customer complaint";
};

export default function SmartReviewDashboard() {
  // Session Utilisateur
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Thème, Langue & Onglets
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [activeTab, setActiveTab] = useState<'reviews' | 'leads'>('reviews');
  const [loading, setLoading] = useState(false);
  
  // Données Restaurant, Avis & Leads
  const [restaurant, setRestaurant] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalReviews: 0,
    avgRating: "5.0",
    satisfactionRate: "100%",
    rewardsCount: 0,
  });

  const [rewardOffer, setRewardOffer] = useState('1 Café offert ☕');
  const [newReward, setNewReward] = useState('');
  const [isUpdatingReward, setIsUpdatingReward] = useState(false);
  const [resolvedIssues, setResolvedIssues] = useState<number[]>([]);

  // Restaurer la session locale au chargement
  useEffect(() => {
    const savedUser = localStorage.getItem('smart_review_session_v2');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      fetchLiveNocoDB(user.instance_name);
    }
  }, []);

  // Connexion Dynamique NocoDB
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
  
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanPassword = passwordInput.trim();
  
    try {
      const res = await fetch(N8N_LOGIN_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
        }),
      });
  
      const raw = await res.json();
      const data = Array.isArray(raw) ? raw[0] : raw;
      
      if (data.success && data.user) {
        // NocoDB renvoie parfois des objets liés
        const instanceName = typeof data.user.instance_name === 'object' 
          ? (data.user.instance_name.instance_name || data.user.instance_name.Id || "")
          : data.user.instance_name;
      
        const restaurantName = typeof data.user.restaurant_name === 'object'
          ? (data.user.restaurant_name.instance_name || data.user.restaurant_name.restaurant_name || instanceName)
          : (data.user.restaurant_name || instanceName);
      
        const sessionData = {
          email: data.user.email,
          instance_name: instanceName,
          restaurant_name: restaurantName
        };
  
        setCurrentUser(sessionData);
        localStorage.setItem('smart_review_session_v2', JSON.stringify(sessionData));
        fetchLiveNocoDB(sessionData.instance_name);
      } else {
        setLoginError(data.error || 'Email ou mot de passe incorrect');
      }
    } catch (err) {
      setLoginError('Connection error / خطأ في الاتصال');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Déconnexion
  const handleLogout = () => {
    localStorage.removeItem('smart_review_session_v2');
    setCurrentUser(null);
    setEmailInput('');
    setPasswordInput('');
  };

  // Chargement Dynamique des Avis & Leads Wi-Fi (Avec Filtrage Souple par Marque)
  const fetchLiveNocoDB = async (instanceName?: string) => {
    setLoading(true);
    const targetInstance = (instanceName || currentUser?.instance_name || "").trim().toLowerCase();

    try {
      // 1. Fiche du Restaurant
      const resRest = await fetch(N8N_RESTAURANTS_API);
      if (resRest.ok) {
        const restData = await resRest.json();
        const restList = Array.isArray(restData) ? restData : (restData.list || []);
        
        const matchedRest = restList.find((r: any) => 
          isInstanceMatch(r.instance_name, targetInstance)
        );

        if (matchedRest) {
          setRestaurant({
            Id: matchedRest.Id,
            restaurant_name: matchedRest.restaurant_name || "Restaurant",
            city: matchedRest.city || "الرياض",
            status: matchedRest.status || "Active"
          });
          if (matchedRest.reward_offer) setRewardOffer(matchedRest.reward_offer);
        }
      }

      // 2. Avis Filtrés Souplement par Restaurant
      const resRev = await fetch(`${N8N_REVIEWS_API}?instance=${targetInstance}`);
      if (resRev.ok) {
        const data = await resRev.json();
        const rawList = data.list || (Array.isArray(data) ? data : []);
        
        const list = rawList.filter((r: any) => 
          isInstanceMatch(r.instance_name, targetInstance)
        );

        setReviews(list);

        const total = list.length;
        const positive = list.filter((r: any) => r.sentiment?.trim() === 'positive' || Number(r.rating) >= 4).length;
        const ratings = list.map((r: any) => Number(r.rating) || 5);
        const avg = total > 0 ? (ratings.reduce((a: number, b: number) => a + b, 0) / total).toFixed(1) : "5.0";

        setStats({
          totalReviews: total,
          avgRating: total > 0 ? avg : "5.0",
          satisfactionRate: total > 0 ? Math.round((positive / total) * 100) + "%" : "100%",
          rewardsCount: positive,
        });
      }

      // 3. Leads Wi-Fi Capturés (Filtrage Souple par Marque)
      const resLeads = await fetch(N8N_LEADS_API);
      if (resLeads.ok) {
        const dataLeads = await resLeads.json();
        
        let rawLeads: any[] = [];
        if (Array.isArray(dataLeads)) {
          rawLeads = dataLeads;
        } else if (dataLeads.list && Array.isArray(dataLeads.list)) {
          rawLeads = dataLeads.list;
        } else if (typeof dataLeads === 'object' && dataLeads !== null) {
          rawLeads = [dataLeads];
        }
        
        const filteredLeads = rawLeads.filter((l: any) => 
          isInstanceMatch(l.instance_name, targetInstance)
        );

        setLeads(filteredLeads);
      }

    } catch (error) {
      console.error("Erreur de synchro NocoDB:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportLeadsCSV = () => {
    if (leads.length === 0) return;
    const headers = ["Phone Number", "Source", "Date"];
    const rows = leads.map(l => [
      `+${l.client_phone?.trim()}`,
      l.source || "WiFi",
      l.CreatedAt ? new Date(l.CreatedAt).toLocaleDateString() : "Recent"
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `contacts_${currentUser?.instance_name || 'leads'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpdateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReward.trim() || !restaurant?.Id) return;
    setIsUpdatingReward(true);

    try {
      await fetch(N8N_UPDATE_REWARD_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurant.Id,
          reward_offer: newReward.trim(),
        }),
      });

      setRewardOffer(newReward.trim());
      setNewReward('');
    } catch (err) {
      setRewardOffer(newReward.trim());
      setNewReward('');
    } finally {
      setIsUpdatingReward(false);
    }
  };

  const toggleResolve = (id: number) => {
    setResolvedIssues(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const negativeReviews = reviews.filter(r => Number(r.rating) <= 3 || r.sentiment?.trim() === 'negative');

  const t = {
    ar: {
      title: restaurant?.restaurant_name || "لوحة التحكم الإدارية",
      subtitle: `مدينة ${restaurant?.city || 'الرياض'} • Smart Review AI v2.0`,
      whatsappConnected: "واتساب متصل",
      totalReviews: "إجمالي التقييمات",
      avgRating: "متوسط التقييم",
      satisfactionRate: "نسبة الرضا",
      rewardsGiven: "الهدايا الموزعة",
      negativeAlertTitle: "مركز اعتراض الشكاوى (تتطلب إجراء سريع)",
      callClient: "الاتصال بالعميل",
      markResolved: "تحديد كتم الحل",
      resolved: "تم المعالجة",
      feedTitle: "سجل التقييمات والردود الآلية",
      editRewardTitle: "تعديل عرض الهدية الحالية",
      save: "حفظ العرض",
      rewardPlaceholder: "مثال: 1 حلى مجاني 🍰",
      allRatings: "جميع التقييمات",
      positive: "إيجابي",
      negative: "سلبي",
      noReviews: "لا توجد تقييمات مسجلة حالياً لهذا المطعم",
      refresh: "تحديث البيانات Live",
      logout: "تسجيل الخروج",
      tabReviews: "التقييمات والمؤشرات 📊",
      tabLeads: "قائمة العملاء والواي فاي 👥",
      exportBtn: "تصدير الملف إلى Excel 📥",
      phoneCol: "رقم الهاتف",
      sourceCol: "المصدر",
      dateCol: "التاريخ",
      noLeads: "لا توجد أرقام هواتف مسجلة حتى الآن"
    },
    en: {
      title: restaurant?.restaurant_name || "Manager Dashboard",
      subtitle: `${restaurant?.city || 'Riyadh'} • Smart Review AI v2.0`,
      whatsappConnected: "WhatsApp Connected",
      totalReviews: "Total Reviews",
      avgRating: "Average Rating",
      satisfactionRate: "Satisfaction Rate",
      rewardsGiven: "Rewards Distributed",
      negativeAlertTitle: "Complaint Interception Center (Action Required)",
      callClient: "Call Customer",
      markResolved: "Mark as Resolved",
      resolved: "Resolved",
      feedTitle: "Review History & AI Responses",
      editRewardTitle: "Update Current Reward Offer",
      save: "Save Offer",
      rewardPlaceholder: "e.g., 1 Free Dessert 🍰",
      allRatings: "All Ratings",
      positive: "Positive",
      negative: "Negative",
      noReviews: "No reviews currently recorded for this restaurant",
      refresh: "Refresh Live Data",
      logout: "Logout",
      tabReviews: "Reviews & Metrics 📊",
      tabLeads: "Customer Leads & Wi-Fi 👥",
      exportBtn: "Export to Excel/CSV 📥",
      phoneCol: "Phone Number",
      sourceCol: "Source",
      dateCol: "Date Captured",
      noLeads: "No customer phone numbers captured yet"
    }
  }[lang];

  // ECRAN DE CONNEXION
  if (!currentUser) {
    return (
      <div dir="rtl" className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 font-['Cairo']">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6 shadow-2xl">
          
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20 text-purple-400 mb-2">
              <Star className="w-8 h-8 fill-purple-400" />
            </div>
            <h1 className="text-3xl font-black text-amber-500">Smart Review AI</h1>
            <p className="text-xs text-zinc-400">بوابة إدارات المطاعم والمقاهي • Gamification v2.0</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-bold">البريد الإلكتروني / Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute right-3 top-3.5 z-10" />
                <input
                  type="email"
                  required
                  dir="ltr"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="abdel@hellomycoach.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pr-10 pl-4 py-2.5 text-sm text-left font-sans focus:outline-none focus:border-amber-500 transition text-zinc-100"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-bold">كلمة المرور / Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute right-3 top-3.5 z-10" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  dir="ltr"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pr-10 pl-10 py-2.5 text-sm text-left font-mono focus:outline-none focus:border-amber-500 transition text-zinc-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-3 text-zinc-500 hover:text-amber-500 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <p className="text-xs text-rose-500 font-bold text-center pt-1">{loginError}</p>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-sm py-3 rounded-xl transition shadow-lg flex items-center justify-center gap-2"
            >
              {isLoggingIn ? <RefreshCw className="w-4 h-4 animate-spin" /> : "تسجيل الدخول / Login"}
            </button>
          </form>

          <div className="border-t border-zinc-800 pt-4 text-center">
            <p className="text-[10px] text-zinc-500">Smart Review AI • Multi-Tenant SaaS Platform v2.0</p>
          </div>

        </div>
      </div>
    );
  }

  // ================= DASHBOARD MANAGER =================
  return (
    <div 
      dir={lang === 'ar' ? 'rtl' : 'ltr'} 
      className={`min-h-screen font-['Cairo',sans-serif] transition-colors duration-300 ${
        isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* HEADER */}
        <header className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6 ${
          isDarkMode ? 'border-zinc-800' : 'border-slate-200'
        }`}>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-extrabold text-amber-500">{t.title}</h1>
              <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 font-bold border border-purple-500/20">
                PRO v2.0
              </span>
            </div>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>{t.subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchLiveNocoDB(currentUser.instance_name)}
              className={`p-2 rounded-xl border transition flex items-center justify-center gap-1 text-xs font-bold ${
                isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-slate-200 text-slate-700 shadow-sm'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-500' : ''}`} />
              {t.refresh}
            </button>

            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {t.whatsappConnected}
            </span>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-xl border transition flex items-center justify-center ${
                isDarkMode ? 'bg-zinc-900 border-zinc-800 text-amber-400' : 'bg-white border-slate-200 text-slate-700 shadow-sm'
              }`}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition ${
                isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-200' : 'bg-white border-slate-200 text-slate-800 shadow-sm'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-amber-500" />
              {lang === 'ar' ? 'English' : 'العربية'}
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-900/40 bg-rose-500/10 text-rose-400 text-xs font-bold hover:bg-rose-500/20 transition"
              title="Déconnexion"
            >
              <LogOut className="w-3.5 h-3.5" />
              {t.logout}
            </button>
          </div>
        </header>

        {/* BARRE DE NAVIGATION DES ONGLETS */}
        <div className="flex border-b border-zinc-800 gap-4">
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 text-sm font-bold transition border-b-2 flex items-center gap-2 ${
              activeTab === 'reviews' 
                ? 'border-amber-500 text-amber-500' 
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            {t.tabReviews}
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`pb-3 text-sm font-bold transition border-b-2 flex items-center gap-2 ${
              activeTab === 'leads' 
                ? 'border-emerald-500 text-emerald-400' 
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-4 h-4" />
            {t.tabLeads} ({leads.length})
          </button>
        </div>

        {/* ONGLET 1 : AVIS & METRIQUES */}
        {activeTab === 'reviews' && (
          <div className="space-y-8">
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`p-5 rounded-2xl border transition shadow-sm ${isDarkMode ? 'bg-zinc-900/80 border-zinc-800/80' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center text-xs text-zinc-400">
                  <span>{t.totalReviews}</span>
                  <MessageSquare className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-3xl font-black mt-3">{stats.totalReviews}</p>
              </div>

              <div className={`p-5 rounded-2xl border transition shadow-sm ${isDarkMode ? 'bg-zinc-900/80 border-zinc-800/80' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center text-xs text-zinc-400">
                  <span>{t.avgRating}</span>
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                </div>
                <p className="text-3xl font-black mt-3 text-amber-400">{stats.avgRating} <span className="text-sm text-zinc-500">/ 5</span></p>
              </div>

              <div className={`p-5 rounded-2xl border transition shadow-sm ${isDarkMode ? 'bg-zinc-900/80 border-zinc-800/80' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center text-xs text-zinc-400">
                  <span>{t.satisfactionRate}</span>
                  <span className="text-emerald-500">👍</span>
                </div>
                <p className="text-3xl font-black mt-3 text-emerald-400">{stats.satisfactionRate}</p>
              </div>

              <div className={`p-5 rounded-2xl border transition shadow-sm ${isDarkMode ? 'bg-zinc-900/80 border-zinc-800/80' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center text-xs text-zinc-400">
                  <span>{t.rewardsGiven}</span>
                  <Gift className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-3xl font-black mt-3">{stats.rewardsCount}</p>
                <span className="text-[10px] text-amber-500 font-bold mt-1 inline-block">{rewardOffer}</span>
              </div>
            </section>

            {negativeReviews.length > 0 && (
              <section className={`rounded-2xl p-6 border transition ${isDarkMode ? 'bg-rose-950/20 border-rose-900/40' : 'bg-rose-50 border-rose-200'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-rose-500/10 rounded-xl text-rose-500 border border-rose-500/20">
                    <AlertTriangle className="w-5 h-5 animate-bounce" />
                  </div>
                  <h2 className={`font-bold text-base ${isDarkMode ? 'text-rose-200' : 'text-rose-900'}`}>{t.negativeAlertTitle}</h2>
                </div>

                <div className="space-y-3">
                  {negativeReviews.map((rev) => (
                    <div key={rev.Id} className={`p-4 rounded-xl border transition ${
                      resolvedIssues.includes(rev.Id) 
                        ? (isDarkMode ? 'bg-zinc-900/40 border-zinc-800 opacity-60' : 'bg-slate-100 border-slate-200 opacity-60')
                        : (isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-rose-100 shadow-sm')
                    }`}>
                      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div className="space-y-1">
                          <span className="bg-rose-500/10 text-rose-500 font-bold text-xs px-2.5 py-0.5 rounded border border-rose-500/20">
                            ⭐️ {rev.rating || 2}/5 - {t.negative}
                          </span>
                          <p className={`text-sm font-semibold mt-1 ${isDarkMode ? 'text-zinc-200' : 'text-slate-800'}`}>
                            "{getReviewText(rev)}"
                          </p>
                          <p className={`text-xs ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                            الهاتف: <span className="font-mono">+{rev.client_phone?.trim()}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <a 
                            href={`tel:+${rev.client_phone?.trim()}`}
                            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs px-4 py-2.5 rounded-xl transition"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {t.callClient}
                          </a>
                          <button
                            onClick={() => toggleResolve(rev.Id)}
                            className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl border transition ${
                              resolvedIssues.includes(rev.Id)
                                ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
                                : (isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-100 border-slate-200')
                            }`}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            {resolvedIssues.includes(rev.Id) ? t.resolved : t.markResolved}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="font-bold text-lg">{t.feedTitle}</h2>
                  <span className={`text-xs px-3 py-1.5 rounded-xl border font-semibold ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-amber-500' : 'bg-white border-slate-200 text-amber-600 shadow-sm'}`}>
                    {t.allRatings} ({reviews.length})
                  </span>
                </div>

                {reviews.length === 0 ? (
                  <div className={`p-8 text-center rounded-2xl border ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800 text-zinc-500' : 'bg-white border-slate-200 text-slate-400'}`}>
                    {t.noReviews}
                  </div>
                ) : (
                  reviews.map((rev) => (
                    <div key={rev.Id} className={`p-4 rounded-xl border transition space-y-2 ${isDarkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="flex text-amber-400">
                            {'★'.repeat(Number(rev.rating) || 5)}
                          </div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                            Number(rev.rating) >= 4 
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          }`}>
                            {Number(rev.rating) >= 4 ? t.positive : t.negative}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-500">{rev.language?.trim().toUpperCase() || 'FR'}</span>
                      </div>
                      <p className={`text-sm ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>
                        "{getReviewText(rev)}"
                      </p>
                      <div className={`text-xs flex justify-between border-t pt-2 ${isDarkMode ? 'border-zinc-800/60 text-zinc-500' : 'border-slate-100 text-slate-400'}`}>
                        <span>+{rev.client_phone?.trim()}</span>
                        <span>Google Review ✅</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-4">
                <h2 className="font-bold text-lg">{t.editRewardTitle}</h2>
                <div className={`p-5 rounded-2xl border transition space-y-4 ${isDarkMode ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
                      <Gift className="w-6 h-6" />
                    </div>
                    <div>
                      <p className={`text-xs ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>العرض الحالي / Current Offer</p>
                      <p className="font-extrabold text-amber-500 text-base">{rewardOffer}</p>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateReward} className="space-y-3 pt-2">
                    <input
                      type="text"
                      value={newReward}
                      onChange={(e) => setNewReward(e.target.value)}
                      placeholder={t.rewardPlaceholder}
                      className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-amber-500 transition ${
                        isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={isUpdatingReward}
                      className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs py-3 rounded-xl transition shadow-md"
                    >
                      {isUpdatingReward ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" />{t.save}</>}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET 2 : FICHIER CLIENTS & LEADS WIFI */}
        {activeTab === 'leads' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-emerald-400">{t.tabLeads}</h2>
                <p className="text-xs text-zinc-400 mt-0.5">قائمة أرقام هواتف العملاء المجمعة عبر الواي فاي والمنيو الرقمي</p>
              </div>

              <button
                onClick={exportLeadsCSV}
                disabled={leads.length === 0}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black text-xs px-4 py-2.5 rounded-xl transition shadow-lg disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {t.exportBtn}
              </button>
            </div>

            <div className={`border rounded-2xl overflow-hidden ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              {leads.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm font-medium">
                  {t.noLeads}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-sm">
                    <thead className={`text-xs border-b ${isDarkMode ? 'bg-zinc-950/60 border-zinc-800 text-zinc-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                      <tr>
                        <th className="p-4 text-start">{t.phoneCol}</th>
                        <th className="p-4 text-start">{t.sourceCol}</th>
                        <th className="p-4 text-start">{t.dateCol}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {leads.map((lead, idx) => (
                        <tr key={lead.Id || idx} className="hover:bg-zinc-800/30 transition">
                          <td className="p-4 font-mono font-bold text-amber-400">
                            +{lead.client_phone?.trim()}
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <Wifi className="w-3 h-3" />
                              {lead.source || 'WiFi'}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-zinc-400">
                            {lead.CreatedAt ? new Date(lead.CreatedAt).toLocaleDateString() : 'Recent'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
