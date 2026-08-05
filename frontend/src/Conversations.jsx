import React, {useEffect, useState} from 'react'
import {apiFetch} from './api'

export default function Conversations({onSelect, selectedId}){
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)

  useEffect(()=>{ load() }, [])
  async function load(){
    setLoading(true)
    try{
      const res = await apiFetch('/conversations')
      setItems(res || [])
    }catch(err){
      console.error('load conv',err)
    }finally{ setLoading(false) }
  }

  async function createConversation(){
    if(!newName.trim()) return
    setError(null)
    setCreating(true)
    try{
      const res = await apiFetch('/conversations', {method:'POST', body:{name:newName.trim(), participants:[]}})
      setItems(prev => [res, ...prev])
      setNewName('')
      onSelect(res)
    }catch(err){
      setError(err.message)
    }finally{ setCreating(false) }
  }

  return (
    <div className="conversations">
      <div className="conv-header">Conversations</div>
      <div className="conv-create">
        <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="New conversation" />
        <button onClick={createConversation} disabled={creating}>Create</button>
      </div>
      {error && <div className="error">{error}</div>}
      {loading && <div className="muted">Loading…</div>}
      <ul>
        {items.map(c=> (
          <li key={c.id} onClick={()=>onSelect(c)} className={c.id===selectedId? 'selected':''}>
            <div className="title">{c.name || c.id}</div>
            <div className="subtitle">{c.last_message_preview || ''}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
