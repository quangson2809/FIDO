import { useEffect, useState } from 'react'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

type HealthResponse = {
  status: string
}

function App() {
  const [backendStatus, setBackendStatus] = useState('CHECKING')

  useEffect(() => {
    const controller = new AbortController()

    axios
      .get<HealthResponse>(`${API_BASE_URL}/actuator/health`, {
        signal: controller.signal,
      })
      .then(({ data }) => setBackendStatus(data.status))
      .catch((error: unknown) => {
        if (!axios.isCancel(error)) {
          setBackendStatus('UNREACHABLE')
        }
      })

    return () => controller.abort()
  }, [])

  return (
    <main className="min-h-screen bg-base-200 p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl items-center justify-center">
        <div className="card w-full bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="badge badge-primary badge-outline">Bootstrap</div>
            <h1 className="card-title text-4xl">FIDO</h1>
            <p>
              React + TypeScript frontend is running. This page only verifies the
              project setup; application features have not been introduced yet.
            </p>
            <div className="divider" />
            <div className="flex items-center justify-between gap-4">
              <span>Spring Boot backend</span>
              <span
                className={`badge ${
                  backendStatus === 'UP' ? 'badge-success' : 'badge-warning'
                }`}
              >
                {backendStatus}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default App
