import Redis from 'ioredis';
import { NextResponse } from 'next/server';

// Verbindung zu deiner Redis Labs Instanz
const kv = new Redis("redis://default:paxO5J56G4CxjJRhrMbIciADVVJjAyPr@redis-16099.c8.us-east-1-3.ec2.cloud.redislabs.com:16099");

// Fallback Speicher (Falls Redis mal weg ist)
let memoryStatus = "active"; // active, maintenance, closed
let memoryLogs = [];

export async function GET() {
  let status = memoryStatus;
  let logs = memoryLogs;

  try {
    // Daten aus Redis laden
    const kvStatus = await kv.get('kiosk_status');
    const kvLogsRaw = await kv.get('kiosk_logs');
    
    if (kvStatus) status = kvStatus;
    // Da Redis Strings speichert, wandeln wir den String zurück in ein Array um
    if (kvLogsRaw) logs = JSON.parse(kvLogsRaw);
  } catch (e) {
    console.log("Redis nicht verbunden, nutze Memory");
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
      } catch(e) {
        console.error("Redis SetStatus Fehler:", e);
      }
    }

    // Neuen Log hinzufügen
    if (action === 'addLog') {
      const newLog = { 
        time: new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }), 
        msg: logEntry 
      };
      
      memoryLogs.unshift(newLog);
      if (memoryLogs.length > 50) memoryLogs.pop(); // Max 50 Logs
      
      try { 
        // Wir speichern das gesamte Array als JSON-String
        await kv.set('kiosk_logs', JSON.stringify(memoryLogs)); 
      } catch(e) {
        console.error("Redis AddLog Fehler:", e);
      }
    }

    // Logs löschen
    if (action === 'clearLogs') {
      memoryLogs = [];
      try { 
        await kv.set('kiosk_logs', JSON.stringify([])); 
      } catch(e) {
        console.error("Redis ClearLogs Fehler:", e);
      }
    }

  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }

  return NextResponse.json({ success: true, status: memoryStatus, logs: memoryLogs });
}
