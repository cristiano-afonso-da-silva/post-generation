import { NextResponse } from 'next/server';
import { getAIProvider, getActiveChatModel } from '../../config/aiConfig';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    provider: getAIProvider(),
    model: getActiveChatModel(),
    timestamp: new Date().toISOString()
  });
}
