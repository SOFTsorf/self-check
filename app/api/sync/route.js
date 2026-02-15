import Redis from 'ioredis';
import { NextResponse } from 'next/server';

// Verbindung zu deinem Redis Labs Server
// Ich habe die URL direkt eingebaut, damit es sofort funktioniert.
const kv = new Redis("redis://default:paxO5J56G4CxjJRhrMbIciADVVJjAyPr@redis-16099.c8.us-east-1-3.ec2.cloud.redislabs.com:16099");

// Fallback Speicher (Falls Redis mal nicht erreichbar ist)
let memoryStatus = "active";
let memoryLogs = [];

export async function GET() {
  let status = memoryStatus;
  let logs = memoryLogs;

  try {
    // Bei ioredis kommen Daten als String zurück, daher JSON.parse
    const kvStatus = await kv.get('kiosk_status');
    const kvLogsRaw = await kv.get('kiosk_logs');
    
    if (kvStatus) status = kvStatus;
    if (kvLogsRaw) logs = JSON.parse(kvLogsRaw);
  } catch (e) {
    console.log("Redis Labs nicht verbunden, nutze Memory");
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
      try { 
        await kv.set('kiosk_status', value); 
      } catch(e){}
    }

    // Neuen Log hinzufügen
    if (action === 'addLog') {
      const newLog = { 
        time: new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }), 
        msg: logEntry 
      };
      
      memoryLogs.unshift(newLog);
      if (memoryLogs.length > 50) memoryLogs.pop();
      
      try { 
        // Wir speichern das Array als JSON-String in Redis
        await kv.set('kiosk_logs', JSON.stringify(memoryLogs)); 
      } catch(e){}
    }

    // Logs löschen
    if (action === 'clearLogs') {
      memoryLogs = [];
      try { await kv.set('kiosk_logs', JSON.stringify([])); } catch(e){}
    }

  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }

  return NextResponse.json({ success: true, status: memoryStatus, logs: memoryLogs });
}
