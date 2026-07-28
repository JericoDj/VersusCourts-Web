import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from './providers/AppProviders'
import AppRoutes from './routes/AppRoutes'
import './styles/global.css'
// Per-area sheets, one owner each, loaded after global so they can override it.
import './styles/shell.css'
import './styles/clubs.css'
import './styles/play.css'
import './styles/events.css'
import './styles/profile.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </BrowserRouter>
  </React.StrictMode>,
)
