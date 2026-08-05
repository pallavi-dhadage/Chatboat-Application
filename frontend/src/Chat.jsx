import React, {useEffect, useState, useRef} from 'react'
import {io} from 'socket.io-client'
import {apiFetch, getToken} from './api'
import Conversations from './Conversations'
import MessageList from './MessageList'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

export default function Chat(){
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [conversation, setConversation] = useState(null)
  const [sendError, setSendError] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const socketRef = useRef(null)

  useEffect(()=>{
    const token = getToken()
    const socket = io(SOCKET_URL, {auth:{token}, autoConnect: true})
    socketRef.current = socket

    socket.on('connect', ()=>{
      setConnectionStatus('connected')
      if(conversation) socket.emit('join_conversation', {conversation_id: conversation.id})
    })

    socket.on('disconnect', ()=>{
      setConnectionStatus('disconnected')
    })

    socket.on('connect_error', (err)=>{
      setConnectionStatus('error')
      setSendError('Socket connection failed. Please refresh.')
      console.error('socket connect error', err)
    })

    socket.on('new_message', (msg)=>{
      if(!conversation || msg.conversation_id===conversation.id){
        setMessages(m=>[...m, msg])
      }
    })

    socket.on('message_deleted', (data)=>{
      setMessages(m=>m.filter(x=>x.id!==data.id))
    })

    return ()=> socket.disconnect()
  },[])

  useEffect(()=>{
    async function load(){
      if(!conversation) return
      try{
        const res = await apiFetch(`/conversations/${conversation.id}/messages`)
        setMessages(res || [])
        socketRef.current && socketRef.current.emit('join_conversation', {conversation_id: conversation.id})
      }catch(err){
        console.error('load messages', err)
        setSendError('Unable to load messages. Check the backend.')
      }
    }
    load()
  },[conversation])

  async function send(){
    setSendError(null)
    if(!conversation){
      setSendError('Select a conversation first.')
      return
    }
    if(!text.trim()) return
    const socket = socketRef.current
    if(!socket || socket.disconnected){
      setSendError('Offline: unable to send message. Make sure the backend is running.')
      return
    }

    const payload = {conversation_id: conversation.id, text}
    setMessages(m=>[...m, {id: Date.now(), text, local:true, sender:'me'}])
    socket.emit('send_message', payload)
    setText('')
  }

  return (
    <div className="chat-layout">
      <aside className="sidebar">
        <Conversations onSelect={(c)=>setConversation(c)} selectedId={conversation?.id} />
      </aside>
      <section className="main">
        {conversation ? (
          <>
            <div className="conv-title">{conversation.name || conversation.id}</div>
            <div className="connection-status">Socket: {connectionStatus}</div>
            <MessageList messages={messages} />
            {sendError && <div className="error">{sendError}</div>}
            <div className="composer">
              <input value={text} onChange={e=>setText(e.target.value)} placeholder="Type a message"/>
              <button onClick={send} disabled={!conversation || !text.trim() || connectionStatus !== 'connected'}>Send</button>
            </div>
          </>
        ) : (
          <div className="empty">Select a conversation</div>
        )}
      </section>
    </div>
  )
}
