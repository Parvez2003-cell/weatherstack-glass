/**
 * Vercel serverless function for Weatherstack Historical Weather API
 * Handles GET requests with query and historical_date parameters
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' })
  }

  // Read parameters from request
  const { query, historical_date, hourly, interval, units } = req.query

  // Validate required parameters
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return res.status(400).json({ error: 'Missing or invalid "query" parameter' })
  }

  if (!historical_date || typeof historical_date !== 'string' || historical_date.trim() === '') {
    return res.status(400).json({ error: 'Missing or invalid "historical_date" parameter (format: YYYY-MM-DD)' })
  }

  // Get API key from environment variable
  // Note: In Vercel, VITE_ prefixed vars are build-time only, use WEATHERSTACK_KEY for runtime
  const apiKey = process.env.WEATHERSTACK_KEY || process.env.VITE_WEATHERSTACK_KEY

  if (!apiKey || apiKey.trim() === '' || apiKey === 'PASTE_YOUR_WEATHERSTACK_KEY_HERE') {
    return res.status(500).json({
      error: 'Missing API key. Set WEATHERSTACK_KEY or VITE_WEATHERSTACK_KEY environment variable.',
    })
  }

  const trimmedApiKey = apiKey.trim()

  // Build Weatherstack API URL
  const apiUrl = new URL('https://api.weatherstack.com/historical')
  apiUrl.searchParams.set('access_key', trimmedApiKey)
  apiUrl.searchParams.set('query', query.trim())
  apiUrl.searchParams.set('historical_date', historical_date.trim())
  apiUrl.searchParams.set('units', units || 'm')
  
  if (hourly !== undefined) {
    apiUrl.searchParams.set('hourly', hourly === 'true' || hourly === '1' ? '1' : '0')
  }
  
  if (interval !== undefined) {
    apiUrl.searchParams.set('interval', String(interval))
  }

  try {
    // Fetch from Weatherstack API
    const response = await fetch(apiUrl.toString())

    if (!response.ok) {
      const errorText = await response.text()
      return res.status(response.status).json({
        error: `Weatherstack API error: ${response.status}`,
        details: errorText,
      })
    }

    // Parse JSON response
    const data = await response.json()

    // Check for Weatherstack error response
    if (data.success === false && data.error) {
      return res.status(400).json({
        error: data.error.info || 'Weatherstack API error',
        code: data.error.code,
        type: data.error.type,
      })
    }

    // Return successful response
    return res.status(200).json(data)
  } catch (error) {
    console.error('Weatherstack Historical API request failed:', error)
    return res.status(500).json({
      error: 'Failed to fetch historical weather data',
      details: error.message,
    })
  }
}
