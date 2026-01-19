// src/app/api/sync-postseason/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Your dynamic playoff roster syncing logic here...
    const result = await syncPostseasonRosters(); 
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Sync failed" }, { status: 500 });
  }
}