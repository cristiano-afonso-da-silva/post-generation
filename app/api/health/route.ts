import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    model: 'gemini-2.0-flash-exp',
    timestamp: new Date().toISOString()
  });
}

