import React, {useEffect, useState} from 'react'
import {apiFetch, setToken} from './api'

export default function Auth({onAuth, autoLogin}){
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('pallavi@example.com')
  const [password, setPassword] = useState('password123')
  const [name, setName] = useState('Pallavi')
  const [error, setError] = useState(null)

  useEffect(()=>{
    if(autoLogin){
      submit()
    }
  }, [autoLogin])

  async function submit(e){
    e && e.preventDefault()
    setError(null)

    try{
      if(autoLogin){
        await apiFetch('/auth/register', {
          method: 'POST',
          body: {dummy_login:true, email, password, name},
        })

        const res = await apiFetch('/auth/login', {
          method: 'POST',
          body: {email, password},
        })

        const token = res.access_token
        if(token){
          setToken(token)
          onAuth && onAuth(token)
          return
        }
        throw new Error('Login did not return an access token')
      }

      if(mode==='login'){
        const res = await apiFetch('/auth/login', {method:'POST', body:{email,password}})
        const token = res.access_token
        if(token){ setToken(token); onAuth && onAuth(token); return }
        throw new Error('No access_token in response')
      }

      await apiFetch('/auth/register', {method:'POST', body:{email,password,name}})
      setMode('login')
    }catch(err){
      setError(err.message || 'Authentication failed')
    }
  }

  return (
    <div className="auth">
      <h2>{mode==='login' ? 'Login' : 'Register'}</h2>
      <form onSubmit={submit}>
        {mode==='register' && (
          <div><input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} /></div>
        )}
        <div><input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} /></div>
        <div><input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} /></div>
        {error && <div style={{color:'red'}}>{error}</div>}
        <div style={{marginTop:8}}>
          <button type="submit">{mode==='login' ? 'Login' : 'Register'}</button>
          <button type="button" onClick={()=>setMode(mode==='login'?'register':'login')} style={{marginLeft:8}}>
            {mode==='login' ? 'Create account' : 'Have an account?'}
          </button>
        </div>
      </form>
    </div>
  )
}
