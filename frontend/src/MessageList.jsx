import React from 'react'
export default function MessageList({messages}){
  return (
    <div className="messages">
      {messages.map(m=> (
        <div key={m.id} className={m.local? 'msg local':'msg'}>
          <div className="meta">{m.sender_name || m.sender || ''}</div>
          <div className="body">{m.text}</div>
        </div>
      ))}
    </div>
  )
}
