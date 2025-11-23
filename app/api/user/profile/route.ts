import { NextRequest, NextResponse } from 'next/server'
import { updateUserProfile } from '@/app/lib/supabase'
import { getUserCreditsServerSQL } from '@/app/lib/supabase-mcp'

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      )
    }

    // Use the same MCP-compatible function as credits check
    const userCredits = await getUserCreditsServerSQL(userId)

    if (!userCredits) {
      console.error('[USER/PROFILE] Failed to fetch user credits for userId:', userId)
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      accountHandle: userCredits.account_handle || null,
      website: userCredits.website || null,
      creditsRemaining: userCredits.credits_remaining || 0,
      firstName: userCredits.first_name || null,
      brandName: userCredits.brand_name || null,
      brandHandle: userCredits.brand_handle || null,
      brandIntention: userCredits.brand_intention || null,
      topics: userCredits.topics || null,
      templateStyle: userCredits.template_style || null,
      copyTone: userCredits.copy_tone || null,
    })
  } catch (error: any) {
    console.error('[USER/PROFILE] Error fetching user profile:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      userId, 
      accountHandle, 
      website, 
      firstName,
      brandName,
      brandHandle,
      brandIntention,
      topics,
      templateStyle, 
      copyTone 
    } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      )
    }

    // Update user profile fields
    const updatedProfile = await updateUserProfile(userId, {
      account_handle: accountHandle !== undefined ? accountHandle : undefined,
      website: website !== undefined ? website : undefined,
      first_name: firstName !== undefined ? firstName : undefined,
      brand_name: brandName !== undefined ? brandName : undefined,
      brand_handle: brandHandle !== undefined ? brandHandle : undefined,
      brand_intention: brandIntention !== undefined ? brandIntention : undefined,
      topics: topics !== undefined ? topics : undefined,
      template_style: templateStyle !== undefined ? templateStyle : undefined,
      copy_tone: copyTone !== undefined ? copyTone : undefined,
    })

    if (!updatedProfile) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      accountHandle: updatedProfile.account_handle,
      website: updatedProfile.website,
      firstName: updatedProfile.first_name,
      brandName: updatedProfile.brand_name,
      brandHandle: updatedProfile.brand_handle,
      brandIntention: updatedProfile.brand_intention,
      topics: updatedProfile.topics,
      templateStyle: updatedProfile.template_style,
      copyTone: updatedProfile.copy_tone,
    })
  } catch (error: any) {
    console.error('Error updating user profile:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    )
  }
}

