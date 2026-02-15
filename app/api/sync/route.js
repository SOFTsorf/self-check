import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

// Lokaler Speicher als Rückfallebene, falls die Verbindung zur DB kurz weg ist
let memoryStatus = "active";
let memoryLogs = [];

export async function GET() {
  // Diagnose: Prüfen, ob die URL für Redis/KV überhaupt existiert
  if (!process.env.KV_REST_API_URL && !process.env.UPSTASH_REDIS_REST_URL) {
    console.error("KRITISCH: Keine Redis/KV Umgebungsvariablen gefunden! Bitte im Vercel Dashboard unter Storage/Settings prüfen.");
  }

  let status = memoryStatus;
  let logs = memoryLogs;

  try {
    const kvStatus = await kv.get('kiosk_status');
    const kvLogs = await kv.get('kiosk_logs');
    
    if (kvStatus) status = kvStatus;
    if (kvLogs) logs = kvLogs;
  } catch (e) {
    console.log("KV/Redis nicht erreichbar, nutze lokalen Speicher.");
  }

  return NextResponse.json({ status, logs });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, value, logEntry } = body;

    // 1. Status ändern (active, maintenance, closed)
    if (action === 'setStatus') {
      memoryStatus = value;
      try {
        await kv.set('kiosk_status', value);
      } catch(e) {
        console.error("Fehler beim Speichern des Status in Redis:", e);
      }
    }

    // 2. Einen neuen Log-Eintrag hinzufügen
    if (action === 'addLog') {
      const newLog = { 
        time: new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }), 
        msg: logEntry 
      };
      
      memoryLogs.unshift(newLog);
      if (memoryLogs.length > 50) memoryLogs.pop(); // Maximal 50 Einträge behalten
      
      try {
        // Wir holen erst die aktuellen Logs aus Redis, fügen den neuen hinzu und speichern alles
        let currentKvLogs = await kv.get('kiosk_logs') || [];
        currentKvLogs.unshift(newLog);
        if (currentKvLogs.length > 50) currentKvLogs.pop();
        await kv.set('kiosk_logs', currentKvLogs);
      } catch(e) {
        console.error("Fehler beim Speichern der Logs in Redis:", e);
      }
    }

    // 3. Alle Logs löschen
    if (action === 'clearLogs') {
      memoryLogs = [];
      try {
        await kv.set('kiosk_logs', []);
      } catch(e) {
        console.error("Fehler beim Löschen der Redis-Logs:", e);
      }
    }

    return NextResponse.json({ success: true, status: memoryStatus, logs: memoryLogs });

  } catch (error) {
    console.error("Server-Fehler im POST-Handler:", error);
    return NextResponse.json({ error: 'Server-Fehler' }, { status: 500 });
  }
}
