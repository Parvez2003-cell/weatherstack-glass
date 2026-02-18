export type WeatherstackError = {
  success: false
  error: { code: number; type: string; info: string }
}

export type WeatherstackCurrentResponse = {
  request?: { type?: string; query?: string; language?: string; unit?: string }
  location?: {
    name?: string
    country?: string
    region?: string
    lat?: string
    lon?: string
    timezone_id?: string
    localtime?: string
    utc_offset?: string
  }
  current?: {
    observation_time?: string
    temperature?: number
    weather_code?: number
    weather_icons?: string[]
    weather_descriptions?: string[]
    wind_speed?: number
    wind_degree?: number
    wind_dir?: string
    pressure?: number
    precip?: number
    humidity?: number
    cloudcover?: number
    feelslike?: number
    uv_index?: number
    visibility?: number
    // Some plans return these blocks:
    astro?: Record<string, unknown>
    air_quality?: Record<string, unknown>
  }
}

export type WeatherstackHistoricalResponse = WeatherstackCurrentResponse & {
  historical?: Record<
    string,
    {
      date?: string
      mintemp?: number
      maxtemp?: number
      avgtemp?: number
      totalsnow?: number
      sunhour?: number
      uv_index?: number
      hourly?: Array<Record<string, unknown>>
      astro?: Record<string, unknown>
    }
  >
}

export type WeatherstackMarineResponse = {
  request?: { type?: string; query?: string; language?: string; unit?: string }
  location?: WeatherstackCurrentResponse['location']
  // Marine responses vary by plan; keep flexible but typed enough for UI safety:
  marine?: Record<string, unknown>
  forecast?: Record<string, unknown>
  // Some plans return tides as well:
  tides?: unknown
}

type Ok<T> = { ok: true; data: T }
type Err = { ok: false; message: string; details?: unknown }
export type ApiResult<T> = Ok<T> | Err

function toQuery(params: Record<string, string | number | boolean | undefined>) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue
    sp.set(k, String(v))
  }
  return sp.toString()
}

function getEnv(name: string) {
  return (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.[name]
}

function getConfig() {
  const units = (getEnv('VITE_WEATHERSTACK_UNITS')?.trim() || 'm') as 'm' | 'f' | 's'
  return { units }
}

function isWeatherstackError(x: unknown): x is WeatherstackError {
  if (!x || typeof x !== 'object') return false
  const anyX = x as { success?: unknown; error?: unknown }
  return anyX.success === false && typeof anyX.error === 'object' && anyX.error !== null
}

async function request<T>(
  endpoint: '/api/weather' | '/api/historical' | '/api/marine',
  params: Record<string, string | number | boolean | undefined>,
): Promise<ApiResult<T>> {
  const { units } = getConfig()

  // Build API URL with query parameters
  const url = `${endpoint}?${toQuery({
    units,
    ...params,
  })}`

  let res: Response
  try {
    res = await fetch(url)
  } catch (e) {
    return { ok: false, message: 'Network error while contacting API proxy.', details: e }
  }

  let json: unknown
  try {
    json = await res.json()
  } catch (e) {
    return { ok: false, message: 'Failed to parse API response JSON.', details: e }
  }

  // Check for API proxy error response
  if (json && typeof json === 'object' && 'error' in json && !('success' in json)) {
    const errorObj = json as { error?: string; details?: unknown }
    return {
      ok: false,
      message: errorObj.error || 'API proxy error.',
      details: errorObj.details,
    }
  }

  if (isWeatherstackError(json)) {
    const errorInfo = json.error.info || 'Weatherstack error.'
    const errorCode = json.error.code
    const errorType = json.error.type

    // Check for plan limitation errors
    const isPlanLimitation =
      errorCode === 603 ||
      errorType === 'historical_queries_not_supported_on_plan' ||
      errorType === 'bulk_queries_not_supported_on_plan' ||
      errorType === 'forecast_days_not_supported_on_plan' ||
      errorInfo.toLowerCase().includes('subscription plan') ||
      errorInfo.toLowerCase().includes('upgrade your account') ||
      errorInfo.toLowerCase().includes('does not support')

    if (isPlanLimitation) {
      let planMessage = ''
      if (errorType === 'historical_queries_not_supported_on_plan') {
        planMessage = 'Historical weather data requires a Standard plan or higher.'
      } else if (errorInfo.toLowerCase().includes('marine')) {
        planMessage = 'Marine weather data requires a Professional plan or higher.'
      } else {
        planMessage = 'This feature requires a higher subscription plan.'
      }

      return {
        ok: false,
        message: `Plan Limitation: ${errorInfo}\n\n${planMessage} Your current plan only supports Current weather data.`,
        details: json.error,
      }
    }

    return { ok: false, message: errorInfo, details: json.error }
  }

  if (!res.ok) {
    return { ok: false, message: `HTTP error (${res.status}).`, details: json }
  }

  return { ok: true, data: json as T }
}

export function getCurrentWeather(query: string): Promise<ApiResult<WeatherstackCurrentResponse>> {
  return request('/api/weather', { query })
}

export function getHistoricalWeather(
  query: string,
  date: string,
  hourly = true,
): Promise<ApiResult<WeatherstackHistoricalResponse>> {
  return request('/api/historical', {
    query,
    historical_date: date,
    hourly: hourly ? 1 : 0,
    interval: 1,
  })
}

export function getMarineWeather(
  lat: number,
  lon: number,
  opts?: { tide?: boolean },
): Promise<ApiResult<WeatherstackMarineResponse>> {
  // Weatherstack accepts LatLon in "query" parameter (e.g. "40.78,-73.97").
  return request('/api/marine', { query: `${lat},${lon}`, tide: opts?.tide ? 1 : 0 })
}

