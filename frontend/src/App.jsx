import React, {useEffect, useState} from 'react'
import Chat from './Chat'
import Auth from './Auth'
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard'
import {getToken, setToken} from './api'

export default function App(){
  const [token, setTok] = useState(getToken())
  const [view, setView]   = useState('dashboard')
  const [initialized, setInitialized] = useState(false)

  useEffect(()=>{
    const onStorage = ()=> setTok(getToken())
    window.addEventListener('storage', onStorage)
    setInitialized(true)
    return ()=> window.removeEventListener('storage', onStorage)
  },[])

  function handleLogout(){ setToken(null); setTok(null); setView('dashboard') }
  function handleAuth(token){ setToken(token); setTok(token); setView('dashboard') }

  if(!initialized) return <div className="app">Loading...</div>
  if(!token) return <div className="app"><Auth onAuth={handleAuth} autoLogin /></div>

  return (
    <div className="app">
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <h1>Chatboat</h1>
          <div style={{marginTop: 8}}>
            <button onClick={()=>setView('chat')} style={{marginRight: 8,padding:'6px 12px'}}>
              Chat
            </button>
            <button onClick={()=>setView('dashboard')} style={{padding:'6px 12px'}}>
              Dashboard
            </button>
          </div>
        </div>
        <div>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>
      <main>
        {view === 'dashboard' ? <AnalyticsDashboard /> : <Chat />}
      </main>
    </div>
  )
}
