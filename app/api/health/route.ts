import { NextResponse } from 'next/server';
import { getActiveModel, getActiveProvider } from '../../config/aiConfig';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    provider: getActiveProvider(),
    model: getActiveModel(),
    timestamp: new Date().toISOString()
  });
}

