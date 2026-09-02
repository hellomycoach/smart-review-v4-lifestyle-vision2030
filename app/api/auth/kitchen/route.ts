import { NextRequest, NextResponse } from 'next/server';

const NOCODB_HOST = "srv821341.hstgr.cloud";
const NOCODB_PORT = 8086;
const NOCODB_TOKEN = "nc_pat_6hZw4JgAjaFFfNbC7ui1IP4nuCi1mWWWq816JqFs";
const RESTAURANTS_TABLE_ID = "mnq99g2rb63ja4i";

// Master fallback PIN si NocoDB est inaccessible
const DEFAULT_MASTER_PINS: Record<string, string> = {
  bos_cafe_moq: "2030",
  doha_pilot: "2026"
};

// Vérifier si la session courante est autorisée
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawInstance = searchParams.get('instance') || '';
  const cleanInstance = rawInstance.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

  if (!cleanInstance) {
    return NextResponse.json({ authenticated: false }, { status: 400 });
  }

  const cookieName = `sr_kds_auth_${cleanInstance}`;
  const authCookie = request.cookies.get(cookieName)?.value;

  if (authCookie && authCookie.startsWith(`valid_${cleanInstance}_`)) {
    return NextResponse.json({ authenticated: true, instance: cleanInstance });
  }

  return NextResponse.json({ authenticated: false, instance: cleanInstance });
}

// Authentification par Code PIN sécurisé côté serveur (jamais exposé dans le client)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instance, pin } = body;
    const cleanInstance = (instance || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const cleanPin = String(pin || '').trim();

    if (!cleanInstance || !cleanPin) {
      return NextResponse.json(
        { success: false, message: 'Instance ou code PIN manquant' },
        { status: 400 }
      );
    }

    let expectedPin = DEFAULT_MASTER_PINS[cleanInstance] || "2030";

    // 1. Interroger NocoDB pour récupérer le PIN officiel du restaurant
    try {
      const resNoco = await fetch(
        `http://${NOCODB_HOST}:${NOCODB_PORT}/api/v2/tables/${RESTAURANTS_TABLE_ID}/records?where=(instance_name,eq,${cleanInstance})&limit=1`,
        {
          headers: { 'xc-token': NOCODB_TOKEN },
          cache: 'no-store'
        }
      );

      if (resNoco.ok) {
        const data = await resNoco.json();
        const records = Array.isArray(data) ? data : (data.list || []);
        if (records.length > 0 && records[0].kitchen_pin) {
          expectedPin = String(records[0].kitchen_pin).trim();
        }
      }
    } catch (e) {
      console.error("Erreur lecture PIN NocoDB, utilisation fallback:", e);
    }

    // 2. Comparaison stricte côté serveur
    if (cleanPin === expectedPin) {
      const tokenValue = `valid_${cleanInstance}_${Date.now()}`;
      const response = NextResponse.json({
        success: true,
        message: 'Accès Cuisine Autorisé',
        instance: cleanInstance
      });

      // Poser un cookie de session HttpOnly valable 24 heures
      response.cookies.set(`sr_kds_auth_${cleanInstance}`, tokenValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 heures
        path: '/'
      });

      return response;
    } else {
      return NextResponse.json(
        { success: false, message: 'Code PIN incorrect' },
        { status: 401 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// Déconnexion / Verrouillage du KDS
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawInstance = searchParams.get('instance') || '';
  const cleanInstance = rawInstance.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

  const response = NextResponse.json({ success: true, message: 'KDS verrouillé' });
  response.cookies.delete(`sr_kds_auth_${cleanInstance}`);
  return response;
}
