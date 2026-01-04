import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
    userId?: string;
    userIds?: string[];
    role?: string;
    title: string;
    body: string;
    urgency?: 'normal' | 'high' | 'emergency';
    url?: string;
    channel?: 'push' | 'sms' | 'email' | 'all';
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const notification: NotificationRequest = await req.json()

        // Verify authentication
        const authHeader = req.headers.get('Authorization')!
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { data: { user } } = await supabaseClient.auth.getUser(
            authHeader.replace('Bearer ', '')
        )

        if (!user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get target users
        let targetUsers: any[] = []

        if (notification.userId) {
            // Send to single user
            const { data } = await supabaseClient
                .from('profiles')
                .select('id, fcm_token, phone, email, notification_preferences')
                .eq('id', notification.userId)
                .single()

            if (data) targetUsers = [data]
        } else if (notification.userIds) {
            // Send to multiple specific users
            const { data } = await supabaseClient
                .from('profiles')
                .select('id, fcm_token, phone, email, notification_preferences')
                .in('id', notification.userIds)

            if (data) targetUsers = data
        } else if (notification.role) {
            // Send to all users with specific role
            const { data } = await supabaseClient
                .from('profiles')
                .select('id, fcm_token, phone, email, notification_preferences')
                .eq('role', notification.role)

            if (data) targetUsers = data
        }

        if (targetUsers.length === 0) {
            return new Response(
                JSON.stringify({ error: 'No target users found' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const results = {
            push: { sent: 0, failed: 0 },
            sms: { sent: 0, failed: 0 },
            email: { sent: 0, failed: 0 }
        }

        // Send notifications
        for (const targetUser of targetUsers) {
            const prefs = targetUser.notification_preferences || {}
            const channel = notification.channel || 'all'

            // Send push notification
            if ((channel === 'push' || channel === 'all') && targetUser.fcm_token && prefs.push !== false) {
                try {
                    await sendPushNotification(targetUser.fcm_token, notification)
                    results.push.sent++
                } catch (error) {
                    console.error('Push notification error:', error)
                    results.push.failed++
                }
            }

            // Send SMS for high/emergency urgency
            if (
                (channel === 'sms' || channel === 'all') &&
                targetUser.phone &&
                prefs.sms !== false &&
                (notification.urgency === 'high' || notification.urgency === 'emergency')
            ) {
                try {
                    await sendSMS(targetUser.phone, `${notification.title}: ${notification.body}`)
                    results.sms.sent++
                } catch (error) {
                    console.error('SMS error:', error)
                    results.sms.failed++
                }
            }

            // Send email for emergency
            if (
                (channel === 'email' || channel === 'all') &&
                targetUser.email &&
                prefs.email !== false &&
                notification.urgency === 'emergency'
            ) {
                try {
                    await sendEmail(targetUser.email, notification.title, notification.body)
                    results.email.sent++
                } catch (error) {
                    console.error('Email error:', error)
                    results.email.failed++
                }
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: `Notifications sent to ${targetUsers.length} users`,
                results
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Send notification error:', error)
        return new Response(
            JSON.stringify({ error: error.message || 'Failed to send notification' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

// Helper: Send push notification via FCM
async function sendPushNotification(token: string, notification: NotificationRequest) {
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY')

    if (!fcmServerKey) {
        throw new Error('FCM_SERVER_KEY not configured')
    }

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
            'Authorization': `key=${fcmServerKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            to: token,
            notification: {
                title: notification.title,
                body: notification.body,
                icon: '/icons/icon-192.png',
                badge: '/icons/badge-72.png'
            },
            data: {
                url: notification.url || '/',
                urgency: notification.urgency || 'normal',
                tag: `notification-${Date.now()}`
            },
            priority: notification.urgency === 'emergency' ? 'high' : 'normal'
        })
    })

    if (!response.ok) {
        throw new Error(`FCM request failed: ${response.statusText}`)
    }

    return await response.json()
}

// Helper: Send SMS via Africa's Talking
async function sendSMS(phone: string, message: string) {
    const atApiKey = Deno.env.get('AFRICASTALKING_API_KEY')
    const atUsername = Deno.env.get('AFRICASTALKING_USERNAME')

    if (!atApiKey || !atUsername) {
        throw new Error('Africa\'s Talking not configured')
    }

    const response = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
            'apiKey': atApiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            username: atUsername,
            to: phone,
            message: message.slice(0, 160) // SMS character limit
        })
    })

    const result = await response.json()

    if (result.SMSMessageData?.Recipients?.[0]?.status !== 'Success') {
        throw new Error('SMS sending failed')
    }

    return result
}

// Helper: Send email (placeholder - implement with your email service)
async function sendEmail(email: string, subject: string, body: string) {
    // TODO: Implement email sending with SendGrid, Mailgun, etc.
    console.log(`Email would be sent to ${email}: ${subject}`)
    return { sent: true }
}
