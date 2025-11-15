import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let generationIdForCleanup: string | null = null;
  let userIdForCleanup: string | null = null;
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const body = await request.json();
    const { generationId, imageUrls, caption, userId } = body;
    generationIdForCleanup = generationId || null;
    userIdForCleanup = userId || null;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const sanitizedCaption = typeof caption === 'string' ? caption.trim() : '';
    const truncatedCaption =
      sanitizedCaption.length > 450
        ? sanitizedCaption.slice(0, 447).trimEnd() + '...'
        : sanitizedCaption;

    console.log('[Threads Post] Incoming request', {
      userId,
      generationId,
      imageCount: imageUrls?.length || 0,
      captionLength: sanitizedCaption.length,
      truncatedCaptionLength: truncatedCaption.length,
    });

    if (!generationId) {
      return NextResponse.json({ error: 'Missing generationId' }, { status: 400 });
    }

    const { data: generation, error: generationError } = await supabaseAdmin
      .from('generations')
      .select('id')
      .eq('id', generationId)
      .eq('user_id', userId)
      .single();

    if (generationError || !generation) {
      console.warn('[Threads Post] Generation not found or unauthorized', { generationId, userId, generationError });
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }

    const { data: connection, error: connError } = await supabaseAdmin
      .from('threads_connections')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (connError || !connection) {
      console.warn('[Threads Post] No Threads connection found', { userId, connError });
      return NextResponse.json(
        { error: 'Threads account not connected. Please connect your account first.' },
        { status: 400 }
      );
    }

    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Access token expired. Please reconnect your Threads account.' },
        { status: 401 }
      );
    }

    await supabaseAdmin
      .from('generations')
      .update({
        threads_post_status: 'pending',
      })
      .eq('id', generationId)
      .eq('user_id', userId);

    // Threads carousel posting flow
    const hasImages = imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0;
    
    if (hasImages) {
      console.log(`[Threads Post] Creating carousel with ${imageUrls.length} images`);
      
        // Step 1: Create image containers for each image
      const imageContainerIds: string[] = [];
      const maxImages = Math.min(imageUrls.length, 10); // Threads supports up to 10 images
      
      for (let i = 0; i < maxImages; i++) {
        const imageUrl = imageUrls[i];
        console.log(`[Threads Post] Creating image container ${i + 1}/${maxImages}...`);
        console.log(`[Threads Post] Image URL ${i + 1}:`, imageUrl);
        
        try {
          const imageContainerBody = new URLSearchParams({
            image_url: imageUrl,
            media_type: 'IMAGE',
            is_carousel_item: 'true',
            access_token: connection.access_token,
          });

          const imageContainerResponse = await fetch(
            `https://graph.threads.net/v1.0/${connection.threads_user_id}/threads`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: imageContainerBody,
            }
          );

          const imageContainerResult = await imageContainerResponse.json();

          if (!imageContainerResponse.ok || !imageContainerResult.id) {
            console.warn(`⚠️ Image container ${i + 1} creation failed, skipping:`, imageContainerResult);
            continue; // Skip this image and continue with others
          }

          imageContainerIds.push(imageContainerResult.id);
          console.log(`✅ Image container ${i + 1} created:`, imageContainerResult.id);
        } catch (imageError: any) {
          console.warn(`⚠️ Exception creating image container ${i + 1}, skipping:`, imageError.message);
          continue;
        }
      }

      if (imageContainerIds.length === 0) {
        console.warn('[Threads Post] No image containers created, falling back to text-only post');
        // Fall through to text-only posting below
      } else {
        // Step 1.5: Wait for all image containers to finish processing
        console.log(`[Threads Post] Waiting for ${imageContainerIds.length} image containers to finish processing...`);
        
        const pollContainer = async (containerId: string, maxAttempts = 30): Promise<boolean> => {
          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
              const statusResponse = await fetch(
                `https://graph.threads.net/v1.0/${containerId}?fields=status,error_message&access_token=${connection.access_token}`,
                { method: 'GET' }
              );

              const statusData = await statusResponse.json();

              if (!statusResponse.ok) {
                console.warn(`⚠️ Failed to check status for container ${containerId}:`, statusData);
                return false;
              }

              const status = statusData.status;
              console.log(`[Threads Post] Container ${containerId} status (attempt ${attempt}/${maxAttempts}):`, status, statusData);

              if (status === 'FINISHED') {
                return true;
              }

              if (status === 'ERROR' || status === 'EXPIRED') {
                console.warn(`⚠️ Container ${containerId} processing failed:`, statusData.error_message || statusData);
                return false;
              }

              // IN_PROGRESS or other status, continue polling

              // Wait 2 seconds before next poll
              await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (pollError: any) {
              console.warn(`⚠️ Exception polling container ${containerId}:`, pollError.message);
              return false;
            }
          }

          console.warn(`⚠️ Container ${containerId} did not finish within timeout`);
          return false;
        };

        // Poll all containers in parallel
        const pollResults = await Promise.all(
          imageContainerIds.map(id => pollContainer(id))
        );

        // Filter out containers that didn't finish successfully
        const readyContainerIds = imageContainerIds.filter((_, index) => pollResults[index]);

        if (readyContainerIds.length === 0) {
          console.warn('[Threads Post] No image containers finished processing, falling back to text-only post');
          // Fall through to text-only posting below
        } else {
          console.log(`✅ ${readyContainerIds.length}/${imageContainerIds.length} image containers ready`);
          
          // Use only the ready containers
          imageContainerIds.length = 0;
          imageContainerIds.push(...readyContainerIds);
        }
      }

      if (imageContainerIds.length > 0) {
        // Step 2: Create carousel container with all image containers
        console.log(`[Threads Post] Creating carousel container with ${imageContainerIds.length} images`);
        
        const carouselBody = new URLSearchParams({
          media_type: 'CAROUSEL',
          children: imageContainerIds.join(','),
          text: truncatedCaption,
          access_token: connection.access_token,
        });

        const carouselResponse = await fetch(
          `https://graph.threads.net/v1.0/${connection.threads_user_id}/threads`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: carouselBody,
          }
        );

        const carouselResult = await carouselResponse.json();

        if (!carouselResponse.ok || !carouselResult.id) {
          console.error('❌ Carousel container creation failed:', carouselResult);
          await supabaseAdmin
            .from('generations')
            .update({
              threads_post_status: 'failed',
            })
            .eq('id', generationId)
            .eq('user_id', userId);

          return NextResponse.json(
            {
              error:
                carouselResult.error?.message ||
                carouselResult.message ||
                'Failed to create Threads carousel',
              details: carouselResult.error || carouselResult,
            },
            { status: 400 }
          );
        }

        console.log('[Threads Post] Carousel container created', { creationId: carouselResult.id });

        // Step 3: Publish the carousel
        const publishBody = new URLSearchParams({
          creation_id: carouselResult.id,
          access_token: connection.access_token,
        });

        const publishResponse = await fetch(
          `https://graph.threads.net/v1.0/${connection.threads_user_id}/threads_publish`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: publishBody,
          }
        );

        const publishResult = await publishResponse.json();

        if (!publishResponse.ok || !publishResult.id) {
          console.error('❌ Carousel publish failed:', publishResult);
          await supabaseAdmin
            .from('generations')
            .update({
              threads_post_status: 'failed',
            })
            .eq('id', generationId)
            .eq('user_id', userId);

          return NextResponse.json(
            {
              error:
                publishResult.error?.message ||
                publishResult.message ||
                'Failed to publish Threads carousel',
              details: publishResult.error || publishResult,
            },
            { status: 400 }
          );
        }

        await supabaseAdmin
          .from('generations')
          .update({
            threads_post_id: publishResult.id,
            threads_posted_at: new Date().toISOString(),
            threads_post_status: 'posted',
          })
          .eq('id', generationId)
          .eq('user_id', userId);

        console.log('✅ Successfully posted carousel to Threads:', publishResult.id);

        return NextResponse.json({
          success: true,
          postId: publishResult.id,
          message: `Successfully posted carousel with ${imageContainerIds.length} images to Threads!`,
        });
      }
    }

    // Text-only post (fallback or when no images)
    console.log('[Threads Post] Creating text-only post');
    
    const containerBody = new URLSearchParams({
      media_type: 'TEXT',
      text: truncatedCaption,
      access_token: connection.access_token,
    });

    const containerResponse = await fetch(
      `https://graph.threads.net/v1.0/${connection.threads_user_id}/threads`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: containerBody,
      }
    );

    const containerResult = await containerResponse.json();

    if (!containerResponse.ok || !containerResult.id) {
      console.error('❌ Threads container creation failed:', containerResult);
      await supabaseAdmin
        .from('generations')
        .update({
          threads_post_status: 'failed',
        })
        .eq('id', generationId)
        .eq('user_id', userId);

      return NextResponse.json(
        {
          error:
            containerResult.error?.message ||
            containerResult.message ||
            'Failed to create Threads container',
          details: containerResult.error || containerResult,
        },
        { status: 400 }
      );
    }

    console.log('[Threads Post] Text container created', { creationId: containerResult.id });

    const publishBody = new URLSearchParams({
      creation_id: containerResult.id,
      access_token: connection.access_token,
    });

    const publishResponse = await fetch(
      `https://graph.threads.net/v1.0/${connection.threads_user_id}/threads_publish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: publishBody,
      }
    );

    const publishResult = await publishResponse.json();

    if (!publishResponse.ok || !publishResult.id) {
      console.error('❌ Threads publish failed:', publishResult);
      await supabaseAdmin
        .from('generations')
        .update({
          threads_post_status: 'failed',
        })
        .eq('id', generationId)
        .eq('user_id', userId);

      return NextResponse.json(
        {
          error:
            publishResult.error?.message ||
            publishResult.message ||
            'Failed to publish Threads post',
          details: publishResult.error || publishResult,
        },
        { status: 400 }
      );
    }

    await supabaseAdmin
      .from('generations')
      .update({
        threads_post_id: publishResult.id,
        threads_posted_at: new Date().toISOString(),
        threads_post_status: 'posted',
      })
      .eq('id', generationId)
      .eq('user_id', userId);

    console.log('✅ Successfully posted to Threads:', publishResult.id);

    return NextResponse.json({
      success: true,
      postId: publishResult.id,
      message: 'Successfully posted to Threads!',
    });
  } catch (error: any) {
    console.error('❌ Threads post error:', error);

    try {
      if (generationIdForCleanup && userIdForCleanup) {
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          }
        );

        await supabaseAdmin
          .from('generations')
          .update({
            threads_post_status: 'failed',
          })
          .eq('id', generationIdForCleanup)
          .eq('user_id', userIdForCleanup);
      }
    } catch (updateError) {
      // Ignore update errors
    }

    return NextResponse.json(
      {
        error: error.message || 'Failed to post to Threads',
      },
      { status: 500 }
    );
  }
}
