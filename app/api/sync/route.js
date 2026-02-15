import { NextResponse } from 'next/server';

// DEINE FIREBASE URL (Muss mit https:// beginnen und auf .com/ enden)
const FIREBASE_URL = "https://DEIN-PROJEKT-NAME.firebaseio.com/system";

export async function GET() {
  try {
    const res = await fetch(`${FIREBASE_URL}.json`);
    const data = await res.val() || { status: 'active', logs: [] };
    
    // Falls die Datenbank komplett leer ist, Standardwerte senden
    if (!data.status) data.status = 'active';
    if (!data.logs) data.logs = [];

    return NextResponse.json(data);
  } catch (error) {
    console.error("Firebase GET Error:", error);
    return NextResponse.json({ status: 'offline', logs: [], error: error.message });
  }
}

export async function POST(request) {
  try {
    const { action, value, logEntry } = await request.json();

    if (action === 'setStatus') {
      await fetch(`${FIREBASE_URL}/status.json`, {
        method: 'PUT',
        body: JSON.stringify(value)
      });
    }

    if (action === 'addLog') {
      const newLog = { 
        time: new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }), 
        msg: logEntry 
      };
      
      // Aktuelle Logs holen
      const logRes = await fetch(`${FIREBASE_URL}/logs.json`);
      let logs = await logRes.json() || [];
      
      logs.unshift(newLog);
      if (logs.length > 50) logs.pop();
      
      // Neue Liste speichern
      await fetch(`${FIREBASE_URL}/logs.json`, {
        method: 'PUT',
        body: JSON.stringify(logs)
      });
    }

    if (action === 'clearLogs') {
      await fetch(`${FIREBASE_URL}/logs.json`, {
        method: 'PUT',
        body: JSON.stringify([])
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
