/**
 * Vercel serverless function for Weatherstack Current Weather API
 * Handles GET requests with query parameter
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' })
  }

  // Read query from request
  const { query } = req.query

  // Validate query parameter
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return res.status(400).json({ error: 'Missing or invalid "query" parameter' })
  }

  // Get API key from environment variable
  // Note: In Vercel, VITE_ prefixed vars are build-time only, use WEATHERSTACK_KEY for runtime
  // For local dev, Vite proxy handles the API key injection
  const apiKey = process.env.WEATHERSTACK_KEY || process.env.VITE_WEATHERSTACK_KEY

  if (!apiKey || apiKey.trim() === '' || apiKey === 'PASTE_YOUR_WEATHERSTACK_KEY_HERE') {
    console.error('API Key missing:', {
      WEATHERSTACK_KEY: process.env.WEATHERSTACK_KEY ? 'set' : 'not set',
      VITE_WEATHERSTACK_KEY: process.env.VITE_WEATHERSTACK_KEY ? 'set' : 'not set',
    })
    return res.status(500).json({
      error: 'Missing API key. Set WEATHERSTACK_KEY or VITE_WEATHERSTACK_KEY environment variable.',
      debug: {
        hasWEATHERSTACK_KEY: !!process.env.WEATHERSTACK_KEY,
        hasVITE_WEATHERSTACK_KEY: !!process.env.VITE_WEATHERSTACK_KEY,
      },
    })
  }

  // Trim whitespace from API key
  const trimmedApiKey = apiKey.trim()

  // Build Weatherstack API URL
  const units = req.query.units || 'm'
  const apiUrl = new URL('https://api.weatherstack.com/current')
  apiUrl.searchParams.set('access_key', trimmedApiKey)
  apiUrl.searchParams.set('query', query.trim())
  apiUrl.searchParams.set('units', units)
  
  console.log('Weatherstack API request:', {
    url: apiUrl.toString().replace(trimmedApiKey, '***'),
    query: query.trim(),
    units,
  })

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
    // Return in Weatherstack format so frontend can detect plan limitations
    if (data.success === false && data.error) {
      return res.status(400).json(data) // Return full Weatherstack error format
    }

    // Return successful response
    return res.status(200).json(data)
  } catch (error) {
    console.error('Weatherstack API request failed:', error)
    return res.status(500).json({
      error: 'Failed to fetch weather data',
      details: error.message,
    })
  }
}
