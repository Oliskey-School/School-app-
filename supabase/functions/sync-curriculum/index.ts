// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

        const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

        const { subjectId, source } = await req.json()

        if (!subjectId) {
            throw new Error('subjectId is required')
        }

        console.log(`Syncing curriculum for subject ${subjectId} from ${source || 'Standard Sources'}`)

        // 1. Mock Curriculum Data (Distinguished by source/curriculum type)
        interface Topic {
            term: number;
            week_number: number;
            title: string;
            content: string;
            objectives: string[];
        }

        const curriculumData: Record<string, Record<string, Topic[]>> = {
            'british': {
                'Mathematics': [
                    { term: 1, week_number: 1, title: 'Number and Place Value', content: 'Count to and across 100, forwards and backwards.', objectives: ['Count to 100', 'Read and write numbers to 100'] },
                    { term: 1, week_number: 2, title: 'Addition and Subtraction', content: 'Represent and use number bonds and related subtraction facts.', objectives: ['Add 1-digit numbers', 'Subtract 1-digit numbers'] },
                ],
                'English': [
                    { term: 1, week_number: 1, title: 'Phonics and Decoding', content: 'Respond speedily with the correct sound to graphemes.', objectives: ['Blend sounds into words', 'Read common exception words'] },
                ]
            },
            'nigerian': {
                'Mathematics': [
                    { term: 1, week_number: 1, title: 'Whole Numbers', content: 'Counting, reading and writing numbers up to 1,000,000.', objectives: ['Count in thousands', 'Identify place value'] },
                    { term: 1, week_number: 2, title: 'Fractions', content: 'Proper and improper fractions, mixed numbers.', objectives: ['Identify fractions', 'Add simple fractions'] },
                ],
                'English': [
                    { term: 1, week_number: 1, title: 'Grammar: Nouns', content: 'Types of nouns: common, proper, collective.', objectives: ['Identify nouns in sentences', 'Use collective nouns correctly'] },
                ]
            },
            'standard': {
                'General': [
                    { term: 1, week_number: 1, title: 'Foundation Module', content: 'Introduction to the subject and its basics.', objectives: ['Understand core concepts'] },
                ]
            }
        }

        // 2. Fetch subject and determine curriculum source
        const { data: subject } = await supabaseClient
            .from('subjects')
            .select('name, curriculum_id, school_id')
            .eq('id', subjectId)
            .single()

        if (!subject) throw new Error('Subject not found')

        // Fetch school curriculum preference if not explicitly provided
        let curriculumType = source?.toLowerCase()
        if (!curriculumType) {
            const { data: school } = await supabaseClient
                .from('schools')
                .select('settings')
                .eq('id', subject.school_id)
                .single()

            curriculumType = school?.settings?.curriculum_type?.toLowerCase() || 'nigerian'
        }

        console.log(`Using ${curriculumType} curriculum for subject: ${subject.name}`)

        const sourceData = curriculumData[curriculumType] || curriculumData['nigerian']
        const topicsToSync = sourceData[subject.name] || curriculumData['standard']['General']

        // 3. Upsert topics
        for (const topic of topicsToSync) {
            const { error: topicError } = await supabaseClient
                .from('curriculum_topics')
                .upsert({
                    subject_id: subjectId,
                    school_id: subject.school_id,
                    term: topic.term,
                    week_number: topic.week_number,
                    title: topic.title,
                    content: topic.content,
                    learning_objectives: topic.objectives,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'subject_id,term,week_number'
                })

            if (topicError) {
                console.error(`Error syncing topic "${topic.title}": ${topicError.message}`)
            }
        }

        // 4. Update subjects sync info
        const versionTag = `${curriculumType.toUpperCase()}-v${new Date().getMonth() + 1}.${new Date().getFullYear()}`

        await supabaseClient
            .from('subjects')
            .update({
                last_synced_at: new Date().toISOString(),
                version_tag: versionTag
            })
            .eq('id', subjectId)

        return new Response(JSON.stringify({
            success: true,
            message: `Curriculum for "${subject.name}" synced successfully from ${curriculumType.toUpperCase()} source.`,
            version: versionTag,
            topics_synced: topicsToSync.length
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error: any) {
        console.error(`Sync Error: ${error.message}`)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
