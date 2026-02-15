import admin from 'firebase-admin';
import { NextResponse } from 'next/server';

// Firebase Initialisierung
if (!admin.apps.length) {
  admin.initializeApp({
    // Hier fügst du nur deine Firebase URL ein:
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
    console.error("Firebase GET Error:", error);
    return NextResponse.json({ status: 'offline', logs: [] });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, value, logEntry } = body;

    if (action === 'setStatus') {
      await db.ref('system/status').set(value);
    }

    if (action === 'addLog') {
      const newLog = { 
        time: new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }), 
        msg: logEntry 
      };
      
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
    console.error("Firebase POST Error:", error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
