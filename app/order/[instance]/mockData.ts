export interface MenuItemOption {
  id: string;
  name: { ar: string; fr: string; en: string };
  price: number;
}

export interface MenuItemOptionGroup {
  id: string;
  name: { ar: string; fr: string; en: string };
  required: boolean;
  maxSelect?: number;
  options: MenuItemOption[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: { ar: string; fr: string; en: string };
  description: { ar: string; fr: string; en: string };
  price: number;
  image: string;
  calories?: number;
  prepTime?: string;
  isChefPick?: boolean;
  isPopular?: boolean;
  isSpicy?: boolean;
  isVegetarian?: boolean;
  isGlutenFree?: boolean;
  optionGroups?: MenuItemOptionGroup[];
}

export interface MenuCategory {
  id: string;
  name: { ar: string; fr: string; en: string };
  icon: string;
}

export const DEFAULT_CATEGORIES: MenuCategory[] = [
  {
    id: "all",
    name: { ar: "الكل", fr: "Tout le menu", en: "All Menu" },
    icon: "Utensils",
  },
  {
    id: "signatures",
    name: { ar: "أطباق مميزة", fr: "Signatures du Chef", en: "Chef Signatures" },
    icon: "Sparkles",
  },
  {
    id: "starters",
    name: { ar: "المقبلات", fr: "Entrées & Tapas", en: "Starters & Appetizers" },
    icon: "Flame",
  },
  {
    id: "mains",
    name: { ar: "الأطباق الرئيسية", fr: "Plats Principaux", en: "Main Courses" },
    icon: "UtensilsCrossed",
  },
  {
    id: "beverages",
    name: { ar: "المشروبات والقهوة", fr: "Cafés & Boissons", en: "Coffee & Drinks" },
    icon: "Coffee",
  },
  {
    id: "desserts",
    name: { ar: "الحلويات", fr: "Desserts Gourmands", en: "Desserts & Pastries" },
    icon: "Cake",
  },
];

export const DEFAULT_MENU_ITEMS: MenuItem[] = [
  {
    id: "sig-1",
    categoryId: "signatures",
    name: {
      ar: "ستيك تندرلوين واغيو بالزعفران",
      fr: "Filet Wagyu Saisi au Beurre de Safran",
      en: "Seared Wagyu Tenderloin with Saffron Butter"
    },
    description: {
      ar: "لحم واغيو فاخر مع هريس الكمأة السوداء والبطاطس وصلصة الفلفل المدخن الخاصة.",
      fr: "Pièce noble de Wagyu grillée, purée onctueuse à la truffe noire et jus réduit aux baies de genièvre.",
      en: "Prime grilled Wagyu tenderloin with black truffle purée and smoked black pepper reduction."
    },
    price: 185,
    calories: 680,
    prepTime: "20-25 min",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
    isChefPick: true,
    isPopular: true,
    isGlutenFree: true,
    optionGroups: [
      {
        id: "doneness",
        name: { ar: "درجة الاستواء", fr: "Cuisson souhaitée", en: "Meat Doneness" },
        required: true,
        options: [
          { id: "rare", name: { ar: "نصف استواء (Rare)", fr: "Saignant", en: "Rare" }, price: 0 },
          { id: "med-rare", name: { ar: "وسط مائل للاستواء (Med Rare)", fr: "À point", en: "Medium Rare" }, price: 0 },
          { id: "well-done", name: { ar: "مستوي تماماً (Well Done)", fr: "Bien cuit", en: "Well Done" }, price: 0 },
        ]
      },
      {
        id: "sides",
        name: { ar: "إضافات اختيارية", fr: "Suppléments gourmands", en: "Optional Add-ons" },
        required: false,
        options: [
          { id: "extra-truffle", name: { ar: "كمأة سوداء إضافية", fr: "Tranches de truffe noire (+35 SAR)", en: "Extra black truffle slices" }, price: 35 },
          { id: "foie-gras", name: { ar: "فوا جرا مشوي", fr: "Escalope de Foie Gras poêlée (+45 SAR)", en: "Pan-seared Foie Gras" }, price: 45 },
          { id: "asparagus", name: { ar: "هليون مشوي بالزبدة", fr: "Asperges vertes rôties (+18 SAR)", en: "Roasted green asparagus" }, price: 18 },
        ]
      }
    ]
  },
  {
    id: "sig-2",
    categoryId: "signatures",
    name: {
      ar: "ريزوتو الروبيان الملكي والزعفران",
      fr: "Risotto Crémeux aux Gambas Royales & Safran",
      en: "Royal Prawn & Saffron Creamy Risotto"
    },
    description: {
      ar: "أرز أربوريو إيطالي فاخر مع روبيان البحر الأحمر، زعفران أصيل وجبنة البارميزان المعتقة.",
      fr: "Riz Carnaroli crémeux, gambas sauvages flambées, pistils de safran et copeaux de Parmigiano 24 mois.",
      en: "Creamy Carnaroli rice, wild Red Sea royal prawns, pure saffron threads, and 24-month aged parmesan."
    },
    price: 128,
    calories: 540,
    prepTime: "15-20 min",
    image: "https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=800&q=80",
    isChefPick: true,
    isPopular: true,
    optionGroups: [
      {
        id: "prawn-options",
        name: { ar: "خيارات إضافية", fr: "Options supplémentaires", en: "Extra options" },
        required: false,
        options: [
          { id: "extra-prawns", name: { ar: "روبيان إضافي (2 حبة)", fr: "2 Gambas royales en plus (+28 SAR)", en: "2 Extra Royal Prawns" }, price: 28 },
          { id: "spicy-oil", name: { ar: "زيت فلفل حار بالزعتر", fr: "Huile pimentée maison", en: "House spicy herb oil" }, price: 0 },
        ]
      }
    ]
  },
  {
    id: "star-1",
    categoryId: "starters",
    name: {
      ar: "سلطة البوراتا والشمندر المشوي",
      fr: "Burrata Crémeuse & Betteraves Rôties",
      en: "Creamy Burrata & Roasted Beetroot Salad"
    },
    description: {
      ar: "جبنة بوراتا طازجة، شمندر مكرمل، صنوبر محمص، وصلصة الرمان وزيت الزيتون البكر.",
      fr: "Burrata di Puglia crémeuse, jeunes pousses, betteraves caramélisées, pignons de pin et réduction de grenade.",
      en: "Fresh Pugliese burrata, caramelized beetroots, toasted pine nuts, and aged pomegranate balsamic glaze."
    },
    price: 68,
    calories: 410,
    prepTime: "10 min",
    image: "https://images.unsplash.com/photo-1592417817098-8f3d6910985b?auto=format&fit=crop&w=800&q=80",
    isVegetarian: true,
    isGlutenFree: true,
  },
  {
    id: "star-2",
    categoryId: "starters",
    name: {
      ar: "تاكو التونة الحارة وتاتكي الأفوكادو",
      fr: "Tacos Croquants de Thon Rouge & Yuzu",
      en: "Spicy Bluefin Tuna & Yuzu Crispy Tacos"
    },
    description: {
      ar: "3 قطع تاكو مقرمشة محشوة بتونة يابانية متبلة بصلصة المايونيز الحارة وصلصة اليوزو المنعشة.",
      fr: "Trio de mini tacos croustillants, tartare de thon rouge mariné au yuzu, mayonnaise épicée et guacamole d'avocat Hass.",
      en: "Trio of crispy wonton tacos, marinated bluefin tuna, spiced sriracha emulsion, and lime guacamole."
    },
    price: 74,
    calories: 360,
    prepTime: "10-15 min",
    image: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=800&q=80",
    isPopular: true,
    isSpicy: true,
  },
  {
    id: "main-1",
    categoryId: "mains",
    name: {
      ar: "سلمون نرويجي مشوي بالأعشاب والليمون",
      fr: "Pavé de Saumon Sauvage Rôti & Émulsion Citronnée",
      en: "Pan-Roasted Norwegian Salmon with Herb Emulsion"
    },
    description: {
      ar: "سلمون طازج مشوي بجلد مقرمش مع خضار موسمية سوتيه وصلصة الزبدة والليمون المخفوقة.",
      fr: "Filet de saumon à la peau dorée et croustillante, légumes de saison glacés et émulsion au citron confit.",
      en: "Crispy skin Atlantic salmon, glazed garden vegetables, and whipped preserved lemon butter."
    },
    price: 115,
    calories: 520,
    prepTime: "18-20 min",
    image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80",
    isGlutenFree: true,
  },
  {
    id: "main-2",
    categoryId: "mains",
    name: {
      ar: "برغر الشيف باللحم الأنجوس المدخن",
      fr: "Burger Signature Angus & Comté Affiné",
      en: "Signature Smoked Black Angus Truffle Burger"
    },
    description: {
      ar: "شريحة بلاك أنجوس 180غ، جبن شيدر مدخن، بصل مكرمل ببلسميك، مايونيز الكمأة، مع بطاطس مقرمشة.",
      fr: "Steak Black Angus 180g, oignons caramélisés, comté 18 mois, sauce truffe maison et frites dorées.",
      en: "180g prime Black Angus beef, melted aged cheddar, balsamic onion confit, black truffle aioli, golden fries."
    },
    price: 89,
    calories: 820,
    prepTime: "15 min",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
    isPopular: true,
    optionGroups: [
      {
        id: "fries-upgrade",
        name: { ar: "نوع البطاطس", fr: "Choix des frites", en: "Fries Selection" },
        required: false,
        options: [
          { id: "classic-fries", name: { ar: "بطاطس مقلية كلاسيكية", fr: "Frites classiques", en: "Classic French Fries" }, price: 0 },
          { id: "truffle-parm-fries", name: { ar: "بطاطس بالكمأة والبارميزان", fr: "Frites à la truffe & parmesan (+14 SAR)", en: "Truffle & Parmesan Fries" }, price: 14 },
          { id: "sweet-potato", name: { ar: "بطاطا حلوة مقرمشة", fr: "Frites de patates douces (+10 SAR)", en: "Sweet Potato Fries" }, price: 10 },
        ]
      }
    ]
  },
  {
    id: "bev-1",
    categoryId: "beverages",
    name: {
      ar: "سبانش لاتيه بارد مميز",
      fr: "Spanish Latte Glacé Signature",
      en: "Signature Iced Spanish Latte"
    },
    description: {
      ar: "إسبريسو كولومبي فاخر مع حليب مكثف محلى وحليب طازج مع لمسة قرفة ناعمة.",
      fr: "Espresso pur Colombie, lait concentré onctueux, lait frais et voile de cannelle de Ceylan.",
      en: "Specialty Colombian espresso, silky condensed milk, cold milk, and a dusting of Ceylon cinnamon."
    },
    price: 32,
    calories: 210,
    prepTime: "5 min",
    image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=800&q=80",
    isPopular: true,
    optionGroups: [
      {
        id: "milk-type",
        name: { ar: "نوع الحليب", fr: "Choix du lait", en: "Milk Choice" },
        required: false,
        options: [
          { id: "whole-milk", name: { ar: "حليب طازج كامل الدسم", fr: "Lait entier standard", en: "Whole milk" }, price: 0 },
          { id: "oat-milk", name: { ar: "حليب شوفان عضوي", fr: "Lait d'avoine bio (+5 SAR)", en: "Organic oat milk" }, price: 5 },
          { id: "almond-milk", name: { ar: "حليب لوز", fr: "Lait d'amande (+5 SAR)", en: "Almond milk" }, price: 5 },
        ]
      }
    ]
  },
  {
    id: "bev-2",
    categoryId: "beverages",
    name: {
      ar: "موهيتو الباشن فروت والريحان الملكي",
      fr: "Mocktail Fraîcheur Fruit de la Passion & Basilic",
      en: "Royal Passion Fruit & Fresh Basil Sparkler"
    },
    description: {
      ar: "باشن فروت طازج، أوراق ريحان ونعناع، عصير ليمون، ومياه فوارة منعشة.",
      fr: "Pulpe de fruit de la passion frais, feuilles de basilic pourpre, citron vert pressé et eau pétillante.",
      en: "Fresh passion fruit pulp, crushed purple basil, mint, squeezed lime, and sparkling soda."
    },
    price: 36,
    calories: 140,
    prepTime: "5 min",
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80",
    isChefPick: true,
  },
  {
    id: "des-1",
    categoryId: "desserts",
    name: {
      ar: "كيكة التمر بالكراميل المملح والآيس كريم",
      fr: "Gâteau Fondant aux Dattes & Caramel au Beurre Salé",
      en: "Warm Saudi Date Pudding with Salted Caramel"
    },
    description: {
      ar: "كيكة التمر السعودية الدافئة والهشة تقدم مع صوص الكراميل المملح وآيس كريم فانيليا مدغشقر.",
      fr: "Moelleux tiède aux dattes de Médine, coulis de caramel au sel de Guérande et glace vanille bourbon.",
      en: "Warm artisanal Medina date sponge cake, hot salted butter caramel, and Madagascar vanilla bean gelato."
    },
    price: 46,
    calories: 450,
    prepTime: "10 min",
    image: "https://images.unsplash.com/photo-1579372786545-d24232daf58c?auto=format&fit=crop&w=800&q=80",
    isPopular: true,
    isChefPick: true,
  },
  {
    id: "des-2",
    categoryId: "desserts",
    name: {
      ar: "تيراميسو الفستق الحلبي والتوت",
      fr: "Tiramisu Pistache d'Alep & Framboises",
      en: "Artisanal Pistachio & Wild Berry Tiramisu"
    },
    description: {
      ar: "طبقات من بسكويت السافوياردي المنقوع بالقهوة مع كريمة الماسكاربوني الإيطالية وزبدة الفستق الصافي.",
      fr: "Biscuits imbibés d'arabica, crème mascarpone aérée à la pâte de pistache pure et framboises fraîches.",
      en: "Espresso-soaked ladyfingers, velvety mascarpone cream with 100% pure pistachio paste and fresh raspberries."
    },
    price: 49,
    calories: 480,
    prepTime: "5 min",
    image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=80",
  }
];

// --- CATALOGUE SPÉCIFIQUE BO'S COFFEE MALL OF QATAR (bos_cafe_moq) ---
export const BOS_CAFE_CATEGORIES: MenuCategory[] = [
  { id: "all", name: { ar: "الكل", fr: "Tout le menu", en: "All Menu" }, icon: "Coffee" },
  { id: "signatures", name: { ar: "المشروبات التوقيع وبوبا", fr: "Signatures & Boba", en: "Signatures & Boba" }, icon: "Sparkles" },
  { id: "hot_iced", name: { ar: "قهوة ساخنة ومثلجة", fr: "Cafés Chauds & Glacés", en: "Hot & Iced Coffee" }, icon: "Flame" },
  { id: "froccino", name: { ar: "فروتشينو فرابيه", fr: "Froccinos & Frappés", en: "Froccinos & Frappes" }, icon: "Cake" },
  { id: "mojitos", name: { ar: "مشروبات الموهيتو", fr: "Mojitos Frais", en: "Mojito Drinks" }, icon: "Utensils" },
  { id: "combos", name: { ar: "وجبات اقتصادية وعروض", fr: "Formules & Combos", en: "Value Meals & Combos" }, icon: "UtensilsCrossed" }
];

import bosCafeMenuJson from './data/menus/bos_cafe_moq.json';

export function getMenuForInstance(instanceName: string) {
  const clean = (instanceName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean.includes('bos') || clean.includes('moq') || clean.includes('bocafe')) {
    return {
      categories: BOS_CAFE_CATEGORIES,
      items: bosCafeMenuJson as MenuItem[],
      restaurantInfo: {
        name: "Bo's Coffee - Mall of Qatar",
        city: "Doha",
        country: "Qatar",
        currency: "QAR",
        taxRate: 0.0,
        totalTables: 25,
        coverImage: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80"
      }
    };
  }

  return {
    categories: DEFAULT_CATEGORIES,
    items: DEFAULT_MENU_ITEMS,
    restaurantInfo: {
      name: "Lusail Courtyard Café",
      city: "Doha",
      country: "Qatar",
      currency: "QAR",
      taxRate: 0.0,
      totalTables: 20,
      coverImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80"
    }
  };
}
