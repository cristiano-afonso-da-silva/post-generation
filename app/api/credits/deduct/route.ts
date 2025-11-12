import { NextRequest, NextResponse } from 'next/server'
import { deductCreditServerSQL, getUserCreditsServerSQL } from '@/app/lib/supabase-mcp'

export async function POST(request: NextRequest) {
  try {
    const { userId, amount = 1 } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      )
    }

    // Validate amount
    const creditAmount = Math.max(1, Math.floor(amount || 1))

    // Check if user has credits (using MCP-compatible SQL pattern)
    const currentCredits = await getUserCreditsServerSQL(userId)
    if (!currentCredits) {
      return NextResponse.json(
        { error: 'Failed to fetch credits' },
        { status: 500 }
      )
    }

    if (currentCredits.credits_remaining < creditAmount) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 403 }
      )
    }

    // Deduct credit (using MCP-compatible SQL pattern)
    // This matches the SQL that can be tested with: mcp_supabase_execute_sql
    const updatedCredits = await deductCreditServerSQL(userId, creditAmount)

    if (!updatedCredits) {
      return NextResponse.json(
        { error: 'Failed to deduct credit' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      creditsRemaining: updatedCredits.credits_remaining,
      totalCreditsUsed: updatedCredits.total_credits_used,
    })
  } catch (error: any) {
    console.error('Error deducting credit:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to deduct credit' },
      { status: 500 }
    )
  }
}

