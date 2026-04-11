// News Service for crisis signal detection
// Uses NewsAPI.org to fetch and analyze relevant news

const NEWS_API_KEY = import.meta.env.VITE_NEWS_API_KEY
const NEWS_API_URL = 'https://newsapi.org/v2'

if (!NEWS_API_KEY) {
  console.warn('VITE_NEWS_API_KEY not set. News features will use mock data.')
}

/**
 * Fetch crisis signals from news
 * Searches for keywords related to emergencies
 */
export async function fetchCrisisSignals(_searchTerms = [], timeframeHours = 24) {
  const searchTerms = _searchTerms
  if (!GOOGLE_MAPS_API_KEY) {
    return mockFetchCrisisSignals(searchTerms, timeframeHours)
  }

  const defaultTerms = searchTerms.length > 0
    ? searchTerms
    : [
        'disaster',
        'earthquake',
        'flood',
        'fire',
        'pandemic',
        'outbreak',
        'accident',
        'emergency',
      ]

  try {
    const fromDate = new Date(Date.now() - timeframeHours * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    const query = defaultTerms.join(' OR ')
    const response = await fetch(
      `${NEWS_API_URL}/everything?q=${encodeURIComponent(query)}&from=${fromDate}&sortBy=publishedAt&language=en&pageSize=20&apiKey=${NEWS_API_KEY}`,
    )

    if (!response.ok) {
      throw new Error(`News API error: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      articles: data.articles || [],
      totalResults: data.totalResults || 0,
    }
  } catch (error) {
    console.error('Error fetching crisis signals:', error)
    return mockFetchCrisisSignals(searchTerms, timeframeHours)
  }
}

/**
 * Analyze a single article for crisis relevance
 */
export async function analyzeArticleForCrisis(article) {
  const { title, description, content, url } = article

  const crisisKeywords = [
    'disaster',
    'emergency',
    'urgent',
    'critical',
    'deaths',
    'injured',
    'casualties',
    'earthquake',
    'flood',
    'fire',
    'pandemic',
    'outbreak',
    'accident',
    'danger',
    'risk',
  ]

  const locationRegex = /\b([A-Z][a-zA-Z\s]*(?:,?\s*[A-Z]{2})?)\b/g

  const fullText = `${title} ${description || ''} ${content || ''}`.toLowerCase()
  const urgencyScore = crisisKeywords.reduce((score, keyword) => {
    const occurrences = (fullText.match(new RegExp(keyword, 'g')) || []).length
    return score + Math.min(occurrences * 10, 30)
  }, 0)

  const locations = [...new Set((fullText.match(locationRegex) || []).slice(0, 3))]

  return {
    isCrisis: urgencyScore > 25,
    confidence: Math.min(urgencyScore / 100, 1),
    severity: urgencyScore > 70 ? 'high' : urgencyScore > 40 ? 'medium' : 'low',
    locations,
    url,
  }
}

/**
 * Get trending emergency keywords
 */
export async function getTrendingEmergencies() {
  if (!NEWS_API_KEY) {
    return mockGetTrendingEmergencies()
  }

  try {
    const response = await fetch(
      `${NEWS_API_URL}/top-headlines?category=general&language=en&pageSize=50&apiKey=${NEWS_API_KEY}`,
    )

    if (!response.ok) {
      throw new Error(`News API error: ${response.statusText}`)
    }

    const data = await response.json()
    const emergencyArticles = data.articles.filter(
      (article) =>
        article.title.toLowerCase().includes('emergency') ||
        article.title.toLowerCase().includes('disaster') ||
        article.title.toLowerCase().includes('urgent'),
    )

    return emergencyArticles
  } catch (error) {
    console.error('Error getting trending emergencies:', error)
    return mockGetTrendingEmergencies()
  }
}

// Mock functions for development/testing
function mockFetchCrisisSignals(searchTerms = [], timeframeHours = 24) {
  const crisisTypes = [
    'Earthquake in regions causes significant damage',
    'Flooding in area affects thousands',
    'Medical emergency declared in city',
    'Fire emergency in building',
    'Weather emergency warning issued',
  ]

  return {
    articles: crisisTypes.slice(0, 5).map((title, idx) => ({
      id: `mock_${idx}`,
      title,
      description: `Mock news article about a potential emergency situation`,
      url: '#',
      publishedAt: new Date(Date.now() - idx * 3600000).toISOString(),
      source: { name: 'Mock News' },
    })),
    totalResults: 5,
  }
}

function mockGetTrendingEmergencies() {
  return [
    {
      title: 'Heavy rainfall expected in region',
      description: 'Weather authorities warn of flooding',
      url: '#',
    },
    {
      title: 'Medical emergency support needed',
      description: 'Hospital overwhelmed with cases',
      url: '#',
    },
  ]
}
