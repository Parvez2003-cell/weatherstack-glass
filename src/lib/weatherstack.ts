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
  const accessKey = getEnv('VITE_WEATHERSTACK_KEY')?.trim() ?? ''
  const base = (getEnv('VITE_WEATHERSTACK_BASE')?.trim() || '/ws').replace(/\/$/, '')
  const units = (getEnv('VITE_WEATHERSTACK_UNITS')?.trim() || 'm') as 'm' | 'f' | 's'
  return { accessKey, base, units }
}

function isWeatherstackError(x: unknown): x is WeatherstackError {
  if (!x || typeof x !== 'object') return false
  const anyX = x as { success?: unknown; error?: unknown }
  return anyX.success === false && typeof anyX.error === 'object' && anyX.error !== null
}

async function request<T>(
  endpoint: '/current' | '/historical' | '/marine',
  params: Record<string, string | number | boolean | undefined>,
): Promise<ApiResult<T>> {
  const { accessKey, base, units } = getConfig()

  if (!accessKey || accessKey === 'PASTE_YOUR_WEATHERSTACK_KEY_HERE') {
    return {
      ok: false,
      message:
        'Missing API key. Set VITE_WEATHERSTACK_KEY in .env (see .env.example) and restart the dev server.',
    }
  }

  const url = `${base}${endpoint}?${toQuery({
    access_key: accessKey,
    units,
    ...params,
  })}`

  let res: Response
  try {
    res = await fetch(url)
  } catch (e) {
    return { ok: false, message: 'Network error while contacting Weatherstack.', details: e }
  }

  let json: unknown
  try {
    json = await res.json()
  } catch (e) {
    return { ok: false, message: 'Failed to parse API response JSON.', details: e }
  }

  if (isWeatherstackError(json)) {
    return { ok: false, message: json.error.info || 'Weatherstack error.', details: json.error }
  }

  if (!res.ok) {
    return { ok: false, message: `HTTP error (${res.status}).`, details: json }
  }

  return { ok: true, data: json as T }
}

export function getCurrentWeather(query: string): Promise<ApiResult<WeatherstackCurrentResponse>> {
  return request('/current', { query })
}

export function getHistoricalWeather(
  query: string,
  date: string,
  hourly = true,
): Promise<ApiResult<WeatherstackHistoricalResponse>> {
  return request('/historical', { query, historical_date: date, hourly: hourly ? 1 : 0, interval: 1 })
}

export function getMarineWeather(
  lat: number,
  lon: number,
  opts?: { tide?: boolean },
): Promise<ApiResult<WeatherstackMarineResponse>> {
  // Weatherstack accepts LatLon in "query" parameter (e.g. "40.78,-73.97").
  return request('/marine', { query: `${lat},${lon}`, tide: opts?.tide ? 1 : 0 })
}

