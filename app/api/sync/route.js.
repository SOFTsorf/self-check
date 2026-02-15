import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

// Fallback Speicher (Falls Vercel KV nicht eingerichtet ist - resettet sich aber bei Neustart!)
let memoryStatus = "active"; // active, maintenance, closed
let memoryLogs = [];

export async function GET() {
  let status = memoryStatus;
  let logs = memoryLogs;

  // Versuche Daten aus Vercel KV zu laden, wenn verfügbar
  try {
    const kvStatus = await kv.get('kiosk_status');
    const kvLogs = await kv.get('kiosk_logs');
    if (kvStatus) status = kvStatus;
    if (kvLogs) logs = kvLogs;
  } catch (e) {
    console.log("KV nicht verbunden, nutze Memory");
  }

  return NextResponse.json({ status, logs });
}

export async function POST(request) {
  const body = await request.json();
  const { action, value, logEntry } = body;

  try {
    // Status ändern
    if (action === 'setStatus') {
      memoryStatus = value;
      try { await kv.set('kiosk_status', value); } catch(e){}
    }

    // Neuen Log hinzufügen
    if (action === 'addLog') {
      const newLog = { 
        time: new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }), 
        msg: logEntry 
      };
      
      memoryLogs.unshift(newLog);
      if (memoryLogs.length > 50) memoryLogs.pop(); // Max 50 Logs
      
      try { await kv.set('kiosk_logs', memoryLogs); } catch(e){}
    }

    // Logs löschen
    if (action === 'clearLogs') {
      memoryLogs = [];
      try { await kv.set('kiosk_logs', []); } catch(e){}
    }

  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }

  return NextResponse.json({ success: true, status: memoryStatus, logs: memoryLogs });
}
