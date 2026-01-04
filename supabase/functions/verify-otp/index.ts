import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { phone, code } = await req.json()

        if (!phone || !code) {
            return new Response(
                JSON.stringify({ error: 'Phone and code are required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Find valid code
        const { data: verificationData, error: fetchError } = await supabaseClient
            .from('verification_codes')
            .select('*')
            .eq('phone', phone)
            .eq('code', code)
            .gt('expires_at', new Date().toISOString())
            .is('used_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (fetchError || !verificationData) {
            // Increment failed attempts
            await supabaseClient
                .from('verification_codes')
                .update({ attempts: supabaseClient.sql`attempts + 1` })
                .eq('phone', phone)
                .is('used_at', null)

            return new Response(
                JSON.stringify({
                    valid: false,
                    message: 'Invalid or expired verification code'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Check attempts
        if (verificationData.attempts >= 3) {
            return new Response(
                JSON.stringify({
                    valid: false,
                    message: 'Too many failed attempts. Please request a new code.'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Mark code as used
        await supabaseClient
            .from('verification_codes')
            .update({ used_at: new Date().toISOString() })
            .eq('id', verificationData.id)

        // Log audit trail
        await supabaseClient.from('verification_audit_log').insert({
            user_id: verificationData.user_id,
            action: 'phone_verified',
            details: { phone }
        })

        return new Response(
            JSON.stringify({
                valid: true,
                userId: verificationData.user_id,
                message: 'Phone verified successfully'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Verify OTP error:', error)
        return new Response(
            JSON.stringify({ error: error.message || 'Verification failed' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
