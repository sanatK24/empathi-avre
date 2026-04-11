// AI Service for campaign enhancement and urgency analysis
// Uses OpenAI API for NLP tasks

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

if (!OPENAI_API_KEY) {
  console.warn(
    'VITE_OPENAI_API_KEY not set. AI features will use mock responses.',
  )
}

/**
 * Enhance campaign description using AI
 * Extracts urgency indicators, resources, and generates improved copy
 */
export async function enhanceCampaignDescription(
  rawDescription,
  context = {},
) {
  if (!OPENAI_API_KEY) {
    return mockEnhanceCampaignDescription(rawDescription)
  }

  try {
    const prompt = `You are an emergency response expert. Analyze this emergency campaign description and provide:
1. Urgency Score (0-100)
2. List of required resources
3. Key consequences if not addressed
4. Improved description (2-3 sentences, more urgent and clear)

Campaign: "${rawDescription}"
Context: ${JSON.stringify(context)}

Respond in JSON format with keys: urgency_score, resources, consequences, enhanced_text`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an emergency response coordinator analyzing crisis situations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices[0].message.content

    try {
      return JSON.parse(content)
    } catch {
      return mockEnhanceCampaignDescription(rawDescription)
    }
  } catch (error) {
    console.error('Error enhancing campaign:', error)
    return mockEnhanceCampaignDescription(rawDescription)
  }
}

/**
 * Extract urgency signals from crisis articles
 */
export async function extractCrisisSignals(newsHeadlines = []) {
  if (!OPENAI_API_KEY) {
    return mockExtractCrisisSignals(newsHeadlines)
  }

  try {
    const prompt = `Analyze these news headlines for emergency/crisis relevance:
${newsHeadlines.map((h) => `- ${h}`).join('\n')}

For each, determine:
1. Is it a crisis/emergency? (yes/no)
2. Severity (low/medium/high)
3. Crisis type (natural_disaster/pandemic/accident/conflict/other)
4. Affected locations

Return as JSON array with these fields for each headline.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a crisis detection system analyzing news for emergencies.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 800,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices[0].message.content

    try {
      return JSON.parse(content)
    } catch {
      return mockExtractCrisisSignals(newsHeadlines)
    }
  } catch (error) {
    console.error('Error extracting crisis signals:', error)
    return mockExtractCrisisSignals(newsHeadlines)
  }
}

// Mock functions for development/testing
function mockEnhanceCampaignDescription(rawDescription) {
  const hasKeywords = (text, keywords) =>
    keywords.some((kw) => text.toLowerCase().includes(kw))

  const urgencyKeywords = [
    'urgent',
    'critical',
    'emergency',
    'immediate',
    'life-threatening',
    'dying',
    'severe',
  ]
  const resourceKeywords = ['oxygen', 'medicine', 'food', 'transport', 'shelter']

  const urgencyScore = hasKeywords(rawDescription, urgencyKeywords) ? 85 : 60
  const detectedResources = resourceKeywords.filter((r) =>
    hasKeywords(rawDescription, [r]),
  )

  return {
    urgency_score: urgencyScore,
    resources: detectedResources.length > 0 ? detectedResources : ['general_aid'],
    consequences:
      'Without immediate help, lives and well-being are at serious risk.',
    enhanced_text: `URGENT: ${rawDescription.substring(0, 50)}... Immediate help needed.`,
  }
}

function mockExtractCrisisSignals(headlines = []) {
  return headlines.map((headline) => ({
    headline,
    is_crisis: Math.random() > 0.5,
    severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
    crisis_type: 'other',
    affected_locations: ['Multiple'],
  }))
}
