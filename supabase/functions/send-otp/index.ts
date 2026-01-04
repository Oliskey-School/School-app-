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
        const { phone, purpose = 'phone_verification' } = await req.json()

        if (!phone) {
            return new Response(
                JSON.stringify({ error: 'Phone number is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get auth user
        const authHeader = req.headers.get('Authorization')!
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user } } = await supabaseClient.auth.getUser()

        // Generate 6-digit OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString()
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

        // Store OTP in database
        const { error: insertError } = await supabaseClient
            .from('verification_codes')
            .insert({
                phone,
                code,
                user_id: user?.id,
                purpose,
                expires_at: expiresAt.toISOString()
            })

        if (insertError) {
            throw new Error('Failed to store verification code')
        }

        // Send SMS via Africa's Talking
        const atApiKey = Deno.env.get('AFRICASTALKING_API_KEY')
        const atUsername = Deno.env.get('AFRICASTALKING_USERNAME')

        if (atApiKey && atUsername) {
            const message = `Your SchoolApp verification code is: ${code}. Valid for 10 minutes. Do not share this code.`

            const response = await fetch('https://api.africastalking.com/version1/messaging', {
                method: 'POST',
                headers: {
                    'apiKey': atApiKey,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    username: atUsername,
                    to: phone,
                    message: message,
                })
            })

            const result = await response.json()

            if (result.SMSMessageData?.Recipients?.[0]?.status !== 'Success') {
                throw new Error('Failed to send SMS')
            }

            // Log audit trail
            await supabaseClient.from('verification_audit_log').insert({
                user_id: user?.id,
                action: 'phone_verification_sent',
                details: { phone, purpose }
            })

            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Verification code sent',
                    expiresAt: expiresAt.toISOString()
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Fallback to Twilio if Africa's Talking not configured
        const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID')
        const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN')
        const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER')

        if (twilioSid && twilioToken && twilioPhone) {
            const message = `Your SchoolApp verification code is: ${code}. Valid for 10 minutes.`

            const auth = btoa(`${twilioSid}:${twilioToken}`)
            const response = await fetch(
                `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        To: phone,
                        From: twilioPhone,
                        Body: message,
                    })
                }
            )

            if (!response.ok) {
                throw new Error('Failed to send SMS via Twilio')
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Verification code sent',
                    expiresAt: expiresAt.toISOString()
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        throw new Error('No SMS provider configured')

    } catch (error) {
        console.error('Send OTP error:', error)
        return new Response(
            JSON.stringify({ error: error.message || 'Failed to send verification code' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
