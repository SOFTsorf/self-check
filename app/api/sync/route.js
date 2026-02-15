import Redis from 'ioredis';
import { NextResponse } from 'next/server';

// Optimierte Verbindungseinstellungen für Redis Labs
const redisUrl = "redis://default:paxO5J56G4CxjJRhrMbIciADVVJjAyPr@redis-16099.c8.us-east-1-3.ec2.cloud.redislabs.com:16099";

let kv;
try {
  kv = new Redis(redisUrl, {
    connectTimeout: 10000, // 10 Sekunden Zeit zum Verbinden
    maxRetriesPerRequest: 3
  });
  
  kv.on('error', (err) => {
    console.error("Redis Verbindungsfehler:", err);
  });
} catch (e) {
  console.error("Redis Initialisierungsfehler:", e);
}

// Lokale Variablen als Sicherheit
let memoryStatus = "active";
let memoryLogs = [];

export async function GET() {
  try {
    // Teste ob die Verbindung steht
    const kvStatus = await kv.get('kiosk_status').catch(() => null);
    const kvLogsRaw = await kv.get('kiosk_logs').catch(() => null);
    
    let status = kvStatus || memoryStatus;
    let logs = kvLogsRaw ? JSON.parse(kvLogsRaw) : memoryLogs;

    return NextResponse.json({ status, logs });
  } catch (error) {
    console.error("GET Fehler:", error);
    // Selbst bei Fehler geben wir etwas zurück, damit die App nicht "OFFLINE" anzeigt
    return NextResponse.json({ status: memoryStatus, logs: memoryLogs, debug: error.message });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, value, logEntry } = body;

    if (action === 'setStatus') {
      memoryStatus = value;
      await kv.set('kiosk_status', value);
    }

    if (action === 'addLog') {
      const newLog = { 
        time: new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }), 
        msg: logEntry 
      };
      
      // Aus Redis laden, aktualisieren, speichern
      const kvLogsRaw = await kv.get('kiosk_logs');
      let currentLogs = kvLogsRaw ? JSON.parse(kvLogsRaw) : [];
      
      currentLogs.unshift(newLog);
      if (currentLogs.length > 50) currentLogs.pop();
      
      memoryLogs = currentLogs;
      await kv.set('kiosk_logs', JSON.stringify(currentLogs));
    }

    if (action === 'clearLogs') {
      memoryLogs = [];
      await kv.set('kiosk_logs', JSON.stringify([]));
    }

    return NextResponse.json({ success: true, status: memoryStatus, logs: memoryLogs });
  } catch (error) {
    console.error("POST Fehler:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
