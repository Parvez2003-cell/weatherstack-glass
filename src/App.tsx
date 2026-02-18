import './App.css'
import { useMemo, useState } from 'react'
import {
  getCurrentWeather,
  getHistoricalWeather,
  getMarineWeather,
  type WeatherstackCurrentResponse,
  type WeatherstackHistoricalResponse,
  type WeatherstackMarineResponse,
} from './lib/weatherstack'

function App() {
  type Mode = 'current' | 'historical' | 'marine'
  const [mode, setMode] = useState<Mode>('current')

  const [locationQuery, setLocationQuery] = useState('London')
  const [historicalDate, setHistoricalDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  })

  const [lat, setLat] = useState('36.7783')
  const [lon, setLon] = useState('-119.4179')
  const [tide, setTide] = useState(true)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [currentData, setCurrentData] = useState<WeatherstackCurrentResponse | null>(null)
  const [historicalData, setHistoricalData] = useState<WeatherstackHistoricalResponse | null>(null)
  const [marineData, setMarineData] = useState<WeatherstackMarineResponse | null>(null)

  const unitLabel = useMemo(() => {
    const u = import.meta.env.VITE_WEATHERSTACK_UNITS || 'm'
    if (u === 'f') return '°F'
    if (u === 's') return 'K'
    return '°C'
  }, [])

  async function onFetch() {
    setError(null)
    setLoading(true)
    try {
      if (mode === 'current') {
        const r = await getCurrentWeather(locationQuery.trim())
        if (!r.ok) throw new Error(r.message)
        setCurrentData(r.data)
        setHistoricalData(null)
        setMarineData(null)
      } else if (mode === 'historical') {
        const r = await getHistoricalWeather(locationQuery.trim(), historicalDate, true)
        if (!r.ok) throw new Error(r.message)
        setHistoricalData(r.data)
        setCurrentData(null)
        setMarineData(null)
      } else {
        const latNum = Number(lat)
        const lonNum = Number(lon)
        if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
          throw new Error('Please enter valid numeric latitude and longitude.')
        }
        const r = await getMarineWeather(latNum, lonNum, { tide })
        if (!r.ok) throw new Error(r.message)
        setMarineData(r.data)
        setCurrentData(null)
        setHistoricalData(null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  function onReset() {
    setError(null)
    setCurrentData(null)
    setHistoricalData(null)
    setMarineData(null)
  }

  return (
    <div className="appShell">
      <div className="container">
        <header className="glass header">
          <div className="titleBlock">
            <div className="title">Weather Glass</div>
            <div className="subtitle">
              Current · Historical · Marine weather (Weatherstack) — Glass Morphic UI
            </div>
          </div>

          <div className="tabs" role="tablist" aria-label="Weather mode">
            <button
              className="tab"
              role="tab"
              aria-selected={mode === 'current'}
              onClick={() => setMode('current')}
              type="button"
            >
              Current
            </button>
            <button
              className="tab"
              role="tab"
              aria-selected={mode === 'historical'}
              onClick={() => setMode('historical')}
              type="button"
            >
              Historical
            </button>
            <button
              className="tab"
              role="tab"
              aria-selected={mode === 'marine'}
              onClick={() => setMode('marine')}
              type="button"
            >
              Marine
            </button>
          </div>
        </header>

        <section className="glass card controls" aria-label="Filters">
          {(mode === 'historical' || mode === 'marine') && (
            <div
              style={{
                padding: '12px',
                marginBottom: '12px',
                background: 'rgba(255, 193, 7, 0.1)',
                border: '1px solid rgba(255, 193, 7, 0.3)',
                borderRadius: '14px',
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.85)',
              }}
            >
              <strong>ℹ️ Plan Requirement:</strong> {mode === 'historical' ? 'Historical' : 'Marine'} weather data requires a{' '}
              {mode === 'historical' ? 'Standard' : 'Professional'} plan or higher. Free plans only support Current weather.
            </div>
          )}
          <div className="row">
            {(mode === 'current' || mode === 'historical') && (
              <div className="field" style={{ gridColumn: 'span 12' }}>
                <div className="label">Location</div>
                <input
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="e.g. London, New York, 99501, 40.78,-73.97, fetch:ip"
                />
              </div>
            )}

            {mode === 'historical' && (
              <div className="field small">
                <div className="label">Date (YYYY-MM-DD)</div>
                <input
                  type="date"
                  value={historicalDate}
                  onChange={(e) => setHistoricalDate(e.target.value)}
                />
              </div>
            )}

            {mode === 'marine' && (
              <>
                <div className="field small">
                  <div className="label">Latitude</div>
                  <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="36.77" />
                </div>
                <div className="field small">
                  <div className="label">Longitude</div>
                  <input value={lon} onChange={(e) => setLon(e.target.value)} placeholder="-119.41" />
                </div>
                <div className="field small">
                  <div className="label">Tide</div>
                  <select value={tide ? '1' : '0'} onChange={(e) => setTide(e.target.value === '1')}>
                    <option value="1">On</option>
                    <option value="0">Off</option>
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="actions">
            <button className="secondary" type="button" onClick={onReset} disabled={loading}>
              Clear
            </button>
            <button className="primary" type="button" onClick={onFetch} disabled={loading}>
              {loading ? 'Fetching…' : 'Fetch weather'}
            </button>
          </div>

          {error && (
            <div className="error">
              <div style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>{error}</div>
              {error.includes('Plan Limitation') && (
                <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', fontSize: '12px' }}>
                  <strong>Available Plans:</strong>
                  <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
                    <li>Free Plan: Current weather only</li>
                    <li>Standard Plan: Current + Historical weather</li>
                    <li>Professional Plan: All features including Marine weather</li>
                  </ul>
                  <div style={{ marginTop: '8px' }}>
                    <a
                      href="https://weatherstack.com/product"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'rgba(108, 213, 255, 0.9)', textDecoration: 'underline' }}
                    >
                      View plans and upgrade →
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="grid2" aria-label="Results">
          <div className="glass card">
            <div className="pill">
              <span>Tip:</span>
              <span>
                If you see “Missing API key”, open `.env` and paste your Weatherstack key into
                `VITE_WEATHERSTACK_KEY`, then restart `npm run dev`.
              </span>
            </div>
            <div style={{ height: 12 }} />
            {mode === 'current' && (
              <CurrentPanel data={currentData} unitLabel={unitLabel} />
            )}
            {mode === 'historical' && (
              <HistoricalPanel data={historicalData} unitLabel={unitLabel} />
            )}
            {mode === 'marine' && <MarinePanel data={marineData} />}
          </div>

          <div className="glass card" aria-label="Raw API JSON">
            <div className="title" style={{ fontSize: 16 }}>
              Raw response
            </div>
            <div className="subtitle">Useful for debugging/learning the API fields.</div>
            <div style={{ height: 12 }} />
            <pre>
              {JSON.stringify(
                mode === 'current' ? currentData : mode === 'historical' ? historicalData : marineData,
                null,
                2,
              ) || 'No data yet.'}
            </pre>
          </div>
        </section>
      </div>
    </div>
  )
}

export default App

function CurrentPanel({ data, unitLabel }: { data: WeatherstackCurrentResponse | null; unitLabel: string }) {
  const loc = data?.location
  const cur = data?.current

  if (!data) return <div className="subtitle">Fetch current weather to see results.</div>

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="title" style={{ fontSize: 18 }}>
        {loc?.name || 'Unknown location'}
        {loc?.country ? `, ${loc.country}` : ''}
      </div>
      <div className="subtitle">
        {cur?.observation_time ? `Observed: ${cur.observation_time}` : 'Observation time not available'}
        {loc?.localtime ? ` · Local time: ${loc.localtime}` : ''}
      </div>

      <div className="kv">
        <div className="stat">
          <div className="statKey">Temperature</div>
          <div className="statVal">
            {cur?.temperature ?? '—'} {unitLabel}
          </div>
        </div>
        <div className="stat">
          <div className="statKey">Feels like</div>
          <div className="statVal">
            {cur?.feelslike ?? '—'} {unitLabel}
          </div>
        </div>
        <div className="stat">
          <div className="statKey">Humidity</div>
          <div className="statVal">{cur?.humidity ?? '—'}%</div>
        </div>
        <div className="stat">
          <div className="statKey">Wind</div>
          <div className="statVal">
            {cur?.wind_speed ?? '—'} km/h {cur?.wind_dir ? `· ${cur.wind_dir}` : ''}
          </div>
        </div>
      </div>

      <div className="pill">
        <span>Conditions:</span>
        <span>{cur?.weather_descriptions?.join(', ') || '—'}</span>
      </div>
    </div>
  )
}

function HistoricalPanel({
  data,
  unitLabel,
}: {
  data: WeatherstackHistoricalResponse | null
  unitLabel: string
}) {
  const loc = data?.location
  const hist = data?.historical ? Object.values(data.historical)[0] : undefined
  const date = data?.historical ? Object.keys(data.historical)[0] : undefined

  if (!data) return <div className="subtitle">Fetch historical weather to see results.</div>

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="title" style={{ fontSize: 18 }}>
        {loc?.name || 'Unknown location'}
        {loc?.country ? `, ${loc.country}` : ''}
      </div>
      <div className="subtitle">{date ? `Historical date: ${date}` : 'Historical date not available'}</div>

      <div className="kv">
        <div className="stat">
          <div className="statKey">Min temp</div>
          <div className="statVal">
            {hist?.mintemp ?? '—'} {unitLabel}
          </div>
        </div>
        <div className="stat">
          <div className="statKey">Max temp</div>
          <div className="statVal">
            {hist?.maxtemp ?? '—'} {unitLabel}
          </div>
        </div>
        <div className="stat">
          <div className="statKey">Avg temp</div>
          <div className="statVal">
            {hist?.avgtemp ?? '—'} {unitLabel}
          </div>
        </div>
        <div className="stat">
          <div className="statKey">Sun hours</div>
          <div className="statVal">{hist?.sunhour ?? '—'}</div>
        </div>
      </div>

      <div className="pill">
        <span>Hourly data:</span>
        <span>{hist?.hourly ? `${hist.hourly.length} rows` : '—'}</span>
      </div>
    </div>
  )
}

function MarinePanel({ data }: { data: WeatherstackMarineResponse | null }) {
  if (!data) return <div className="subtitle">Fetch marine weather to see results.</div>

  const locName = data.location?.name || data.request?.query || 'Marine location'
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="title" style={{ fontSize: 18 }}>
        {locName}
      </div>
      <div className="subtitle">
        Marine responses can vary by plan; use the Raw response panel to inspect available fields.
      </div>

      <div className="pill">
        <span>Has tides:</span>
        <span>{data.tides ? 'Yes' : 'No / not included'}</span>
      </div>
      <div className="pill">
        <span>Has forecast:</span>
        <span>{data.forecast ? 'Yes' : 'No / not included'}</span>
      </div>
    </div>
  )
}
