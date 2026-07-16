import { useState } from 'react'
import { Flag, Check } from 'lucide-react'

export default function EditNoteSection({ userNote, updateNote, deleteNote }) {
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(userNote.body)
  const [stance, setStance] = useState(userNote.stance)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSave() {
    if (!body.trim()) return
    setSaving(true)
    await updateNote(userNote.id, body.trim(), stance)
    setSaving(false)
    setEditing(false)
  }

  async function handleDelete() {
    if (!confirm('Delete your note? This cannot be undone.')) return
    setDeleting(true)
    await deleteNote(userNote.id)
    setDeleting(false)
  }

  if (!editing) return (
    <div style={{ padding:'12px 14px', background:'rgba(0,255,136,0.04)', border:'1px solid rgba(0,255,136,0.15)', borderRadius:6 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:1, color:'var(--muted)' }}>YOUR NOTE</span>
        <span style={{
          padding:'2px 8px', borderRadius:3, fontFamily:'var(--mono)', fontSize:9,
          background: userNote.stance === 'challenges' ? 'rgba(255,71,87,0.12)' : 'rgba(0,255,136,0.1)',
          color: userNote.stance === 'challenges' ? '#ff4757' : 'var(--verified)'
        }}>
          {userNote.stance === 'challenges'
            ? <><Flag size={10} style={{display:'inline',verticalAlign:'middle',marginRight:3}} />CHALLENGING</>
            : <><Check size={10} style={{display:'inline',verticalAlign:'middle',marginRight:3}} />SUPPORTING</>
          }
        </span>
        <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
          <button onClick={() => setEditing(true)} style={{ padding:'4px 10px', background:'transparent', border:'1px solid var(--border)', color:'var(--muted)', borderRadius:4, fontFamily:'var(--mono)', fontSize:9, cursor:'pointer' }}>EDIT</button>
          <button onClick={handleDelete} disabled={deleting} style={{ padding:'4px 10px', background:'transparent', border:'1px solid #ff4757', color:'#ff4757', borderRadius:4, fontFamily:'var(--mono)', fontSize:9, cursor:'pointer', opacity: deleting ? 0.5 : 1 }}>
            {deleting ? '...' : 'DELETE'}
          </button>
        </div>
      </div>
      <div style={{ fontSize:12, color:'var(--text)', lineHeight:1.5 }}>{userNote.body}</div>
    </div>
  )

  return (
    <div>
      <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:2, color:'var(--muted)', marginBottom:10 }}>EDIT YOUR NOTE</div>
      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        {['challenges','supports'].map(s => (
          <button key={s} onClick={() => setStance(s)} style={{
            flex:1, padding:'8px 0',
            background: stance===s ? (s==='challenges' ? 'rgba(255,71,87,0.15)' : 'rgba(0,255,136,0.12)') : 'transparent',
            border:`1px solid ${stance===s ? (s==='challenges' ? '#ff4757' : 'var(--verified)') : 'var(--border)'}`,
            borderRadius:4, fontFamily:'var(--mono)', fontSize:10,
            color: stance===s ? (s==='challenges' ? '#ff4757' : 'var(--verified)') : 'var(--muted)',
            cursor:'pointer', letterSpacing:1
          }}>
            {s==='challenges'
              ? <><Flag size={10} style={{display:'inline',verticalAlign:'middle',marginRight:3}} />CHALLENGES</>
              : <><Check size={10} style={{display:'inline',verticalAlign:'middle',marginRight:3}} />SUPPORTS</>
            }
          </button>
        ))}
      </div>
      <textarea
        value={body} onChange={e => setBody(e.target.value)}
        maxLength={500} rows={3}
        style={{ width:'100%', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:6, padding:'10px 12px', color:'var(--text)', fontFamily:'var(--sans)', fontSize:12, resize:'none', outline:'none', boxSizing:'border-box', marginBottom:8 }}
        onFocus={e => e.target.style.borderColor='var(--accent)'}
        onBlur={e => e.target.style.borderColor='var(--border)'}
      />
      <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
        <button onClick={() => setEditing(false)} style={{ padding:'7px 14px', background:'transparent', border:'1px solid var(--border)', color:'var(--muted)', borderRadius:4, fontFamily:'var(--mono)', fontSize:10, cursor:'pointer' }}>CANCEL</button>
        <button onClick={handleSave} disabled={!body.trim() || saving} style={{
          padding:'7px 16px',
          background: stance==='challenges' ? '#ff4757' : 'var(--verified)',
          color:'#000', border:'none', borderRadius:4, fontFamily:'var(--mono)', fontSize:10, fontWeight:700,
          cursor: !body.trim() || saving ? 'not-allowed' : 'pointer',
          opacity: !body.trim() || saving ? 0.5 : 1, letterSpacing:1
        }}>
          {saving ? 'SAVING...' : 'SAVE CHANGES'}
        </button>
      </div>
    </div>
  )
}
