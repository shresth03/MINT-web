import { useState } from 'react'
import { useClaims } from '../hooks/useClaims'
import EditNoteSection from './EditNoteSection'

const CLAIM_STYLE = {
  open:       { color: '#ff9f43', label: '⚑ OPEN CLAIM',  bg: 'rgba(255,159,67,0.08)'  },
  verified:   { color: '#00ff88', label: '✓ VERIFIED',    bg: 'rgba(0,255,136,0.08)'   },
  false:      { color: '#ff4757', label: '✗ FALSE',       bg: 'rgba(255,71,87,0.08)'   },
  developing: { color: '#00d4ff', label: '◎ DEVELOPING',  bg: 'rgba(0,212,255,0.08)'   },
  reversed:   { color: '#ffd32a', label: '⟳ REVERSED',   bg: 'rgba(255,211,42,0.08)'  },
}

export default function SourceNoteButton({ post, user }) {
  const [open, setOpen] = useState(false)
  const { claim, notes, userNote, claimVisible, challengeWeight, supportWeight, submitNote, updateNote, deleteNote } = useClaims(post?.id)
  const [stance, setStance] = useState('challenges')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [err, setErr] = useState('')

  if (!post?.id) return null

  const cs = claim ? CLAIM_STYLE[claim.status] : null

  async function handleSubmit() {
    if (!body.trim()) return
    setSubmitting(true)
    const { error } = await submitNote(body.trim(), stance)
    if (error) setErr(typeof error === 'string' ? error : error.message)
    else setSubmitted(true)
    setSubmitting(false)
  }

  return (
    <>
      {claimVisible && claim && cs && (
        <div style={{
          display:'inline-flex', alignItems:'center', gap:5,
          padding:'2px 8px', borderRadius:4, marginTop:8,
          background: cs.bg, border:`1px solid ${cs.color}33`
        }}>
          <span style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:700, color:cs.color, letterSpacing:1 }}>
            {cs.label}
          </span>
          {claim.resolution_note && (
            <span style={{ fontSize:10, color:'var(--muted)', marginLeft:4 }}>— {claim.resolution_note}</span>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen(true)}
        style={{
          background:'none', border:'1px solid var(--border)', borderRadius:4,
          padding:'3px 10px', fontFamily:'var(--mono)', fontSize:9,
          color:'var(--muted)', cursor:'pointer', letterSpacing:1,
          marginTop:8, transition:'all 0.15s'
        }}
        onMouseOver={e => { e.currentTarget.style.color='#ff9f43'; e.currentTarget.style.borderColor='#ff9f43' }}
        onMouseOut={e => { e.currentTarget.style.color='var(--muted)'; e.currentTarget.style.borderColor='var(--border)' }}
      >
        ⚑ NOTE {notes.length > 0 && `(${notes.length})`}
      </button>

      {open && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.75)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000
        }} onClick={() => setOpen(false)}>
          <div style={{
            background:'var(--surface)', border:'1px solid var(--border)',
            borderRadius:10, padding:24, width:500, maxWidth:'92vw',
            maxHeight:'85vh', overflowY:'auto'
          }} onClick={e => e.stopPropagation()}>

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:11, letterSpacing:2, color:'var(--accent)' }}>COMMUNITY NOTES</div>
              <button onClick={() => setOpen(false)} style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:18 }}>×</button>
            </div>

            <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:6, padding:12, marginBottom:16 }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', marginBottom:6 }}>
                {post.users?.username || 'Unknown'}
              </div>
              <div style={{ fontSize:12, color:'var(--text)', lineHeight:1.5 }}>
                {(post.body || '').length > 200 ? (post.body || '').slice(0, 200) + '…' : (post.body || '')}
              </div>
            </div>

            {claimVisible && claim && cs && (
              <div style={{
                padding:'8px 12px', borderRadius:6, marginBottom:16,
                background: cs.bg, border:`1px solid ${cs.color}22`
              }}>
                <span style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:700, color:cs.color }}>{cs.label}</span>
                {claim.resolution_note && (
                  <span style={{ fontSize:11, color:'var(--muted)', marginLeft:8 }}>— {claim.resolution_note}</span>
                )}
              </div>
            )}

            <div style={{ display:'flex', gap:10, marginBottom:16 }}>
              <div style={{ flex:1, padding:'8px 12px', background:'rgba(255,71,87,0.06)', border:'1px solid rgba(255,71,87,0.2)', borderRadius:6, fontFamily:'var(--mono)', fontSize:10, color:'#ff4757', textAlign:'center' }}>
                ⚑ CHALLENGING<br/><span style={{ fontSize:18, fontWeight:700 }}>{challengeWeight}</span>
              </div>
              <div style={{ flex:1, padding:'8px 12px', background:'rgba(0,255,136,0.06)', border:'1px solid rgba(0,255,136,0.2)', borderRadius:6, fontFamily:'var(--mono)', fontSize:10, color:'var(--verified)', textAlign:'center' }}>
                ✓ SUPPORTING<br/><span style={{ fontSize:18, fontWeight:700 }}>{supportWeight}</span>
              </div>
            </div>

            {notes.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:2, color:'var(--muted)', marginBottom:8 }}>NOTES ({notes.length})</div>
                {notes.map(n => (
                  <div key={n.id} style={{
                    padding:'10px 12px', marginBottom:8, background:'var(--bg)', borderRadius:6,
                    border:`1px solid ${n.stance==='challenges' ? 'rgba(255,71,87,0.25)' : 'rgba(0,255,136,0.2)'}`
                  }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6 }}>
                      <span style={{ fontFamily:'var(--mono)', fontSize:10, fontWeight:600, color: n.users?.role==='osint' ? 'var(--verified)' : 'var(--text)' }}>
                        {n.users?.username || 'Unknown'}
                        {n.users?.role==='osint' && <span style={{ color:'var(--verified)', marginLeft:3 }}>◆</span>}
                      </span>
                      <span style={{
                        fontFamily:'var(--mono)', fontSize:8, padding:'1px 6px', borderRadius:3,
                        background: n.stance==='challenges' ? 'rgba(255,71,87,0.15)' : 'rgba(0,255,136,0.12)',
                        color: n.stance==='challenges' ? '#ff4757' : 'var(--verified)'
                      }}>
                        {n.stance==='challenges' ? '⚑ CHALLENGING' : '✓ SUPPORTING'}
                      </span>
                    </div>
                    <div style={{ fontSize:12, color:'var(--text)', lineHeight:1.5 }}>{n.body}</div>
                  </div>
                ))}
              </div>
            )}

            {!submitted && !userNote ? (
              <div>
                <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:2, color:'var(--muted)', marginBottom:10 }}>WRITE A NOTE</div>
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
                      {s==='challenges' ? '⚑ CHALLENGES' : '✓ SUPPORTS'}
                    </button>
                  ))}
                </div>
                <textarea
                  value={body} onChange={e => { setBody(e.target.value); setErr('') }}
                  placeholder={stance==='challenges' ? 'Explain why this claim is inaccurate...' : 'Provide corroboration or context...'}
                  maxLength={500} rows={3}
                  style={{ width:'100%', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:6, padding:'10px 12px', color:'var(--text)', fontFamily:'IBM Plex Sans, sans-serif', fontSize:12, resize:'none', outline:'none', boxSizing:'border-box', marginBottom:8 }}
                  onFocus={e => e.target.style.borderColor='var(--accent)'}
                  onBlur={e => e.target.style.borderColor='var(--border)'}
                />
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--muted)' }}>
                    {body.length}/500
                    {err && <span style={{ color:'var(--accent2)', marginLeft:8 }}>⚠ {err}</span>}
                  </span>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => setOpen(false)} style={{ padding:'7px 14px', background:'transparent', border:'1px solid var(--border)', color:'var(--muted)', borderRadius:4, fontFamily:'var(--mono)', fontSize:10, cursor:'pointer' }}>CANCEL</button>
                    <button onClick={handleSubmit} disabled={!body.trim() || submitting} style={{
                      padding:'7px 16px',
                      background: stance==='challenges' ? '#ff4757' : 'var(--verified)',
                      color:'#000', border:'none', borderRadius:4, fontFamily:'var(--mono)', fontSize:10, fontWeight:700,
                      cursor: !body.trim() || submitting ? 'not-allowed' : 'pointer',
                      opacity: !body.trim() || submitting ? 0.5 : 1, letterSpacing:1
                    }}>
                      {submitting ? '...' : 'SUBMIT NOTE'}
                    </button>
                  </div>
                </div>
              </div>
            ) : userNote && !submitted ? (
              <EditNoteSection userNote={userNote} updateNote={updateNote} deleteNote={deleteNote} />
            ) : (
              <div style={{ padding:'12px 16px', background:'rgba(0,255,136,0.06)', border:'1px solid rgba(0,255,136,0.2)', borderRadius:6, fontFamily:'var(--mono)', fontSize:11, color:'var(--verified)', textAlign:'center' }}>
                ✓ Your note has been submitted
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
