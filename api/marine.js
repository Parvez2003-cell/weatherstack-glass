/**
 * Vercel serverless function for Weatherstack Marine Weather API
 * Handles GET requests with latitude/longitude (as query) and optional tide parameter
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' })
  }

  // Read parameters from request
  const { query, lat, lon, tide, units } = req.query

  // Determine query value: use query param if provided, otherwise construct from lat/lon
  let queryValue = query
  if (!queryValue && lat && lon) {
    queryValue = `${lat},${lon}`
  }

  // Validate query parameter
  if (!queryValue || typeof queryValue !== 'string' || queryValue.trim() === '') {
    return res.status(400).json({
      error: 'Missing or invalid "query" parameter (or provide both "lat" and "lon")',
    })
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
  const apiUrl = new URL('https://api.weatherstack.com/marine')
  apiUrl.searchParams.set('access_key', trimmedApiKey)
  apiUrl.searchParams.set('query', queryValue.trim())
  apiUrl.searchParams.set('units', units || 'm')

  if (tide !== undefined) {
    apiUrl.searchParams.set('tide', tide === 'true' || tide === '1' ? '1' : '0')
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
    // Return in Weatherstack format so frontend can detect plan limitations
    if (data.success === false && data.error) {
      return res.status(400).json(data) // Return full Weatherstack error format
    }

    // Return successful response
    return res.status(200).json(data)
  } catch (error) {
    console.error('Weatherstack Marine API request failed:', error)
    return res.status(500).json({
      error: 'Failed to fetch marine weather data',
      details: error.message,
    })
  }
}
