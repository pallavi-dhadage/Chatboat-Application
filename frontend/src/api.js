export function getToken(){
  return localStorage.getItem('chat_token')
}
export function setToken(t){
  if(t) localStorage.setItem('chat_token', t)
  else localStorage.removeItem('chat_token')
}

export async function apiFetch(path, opts={}){
  const base = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'
  const headers = opts.headers || {}
  const token = getToken()
  if(token) headers['Authorization'] = `Bearer ${token}`
  if(opts.body && !(opts.body instanceof FormData)){
    headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(opts.body)
  }
  const res = await fetch(base + path, {...opts, headers})
  if(!res.ok){
    const text = await res.text()
    throw new Error(text || res.statusText)
  }
  try{ return await res.json() }catch(e){ return null }
}
