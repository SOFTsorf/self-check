import admin from 'firebase-admin';
import { NextResponse } from 'next/server';

// Firebase Initialisierung (verhindert Mehrfach-Initialisierung)
if (!admin.apps.length) {
  admin.initializeApp({
    // ERSETZE DIESE URL MIT DEINER FIREBASE URL:
    databaseURL: "https://durchagngssystem.firebaseio.com/" 
  });
}

const db = admin.database();

export async function GET() {
  try {
    const snapshot = await db.ref('system').once('value');
    const data = snapshot.val() || { status: 'active', logs: [] };
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ status: 'error', logs: [], msg: error.message });
  }
}

export async function POST(request) {
  try {
    const { action, value, logEntry } = await request.json();

    if (action === 'setStatus') {
      await db.ref('system/status').set(value);
    }

    if (action === 'addLog') {
      const newLog = { 
        time: new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }), 
        msg: logEntry 
      };
      
      // Holen, Hinzufügen, Kürzen, Speichern
      const snapshot = await db.ref('system/logs').once('value');
      let logs = snapshot.val() || [];
      logs.unshift(newLog);
      if (logs.length > 50) logs.pop();
      
      await db.ref('system/logs').set(logs);
    }

    if (action === 'clearLogs') {
      await db.ref('system/logs').set([]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
