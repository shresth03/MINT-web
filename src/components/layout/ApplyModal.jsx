import { useState } from "react"

export default function ApplyModal({ onClose }) {
  const [applied, setApplied] = useState(false)
  const [form, setForm] = useState({ channel: "", handle: "", portfolio: "", why: "" })

  const handleSubmit = () => {
    setApplied(true)
    setTimeout(() => { onClose() }, 2000)
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        {applied ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12, color: "var(--verified)" }}>◆</div>
            <div style={{ fontFamily: "var(--mono)", color: "var(--verified)", fontSize: 14, marginBottom: 8 }}>
              APPLICATION SUBMITTED
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Your application is under review. You'll be notified within 72 hours.
            </div>
          </div>
        ) : (
          <>
            <div className="modal-title">◈ Apply for OSINT Channel Status</div>
            <div className="modal-sub">
              Verified OSINT channels gain exclusive access to post in the Intel Stories section.
            </div>

            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--accent)", letterSpacing: 2, marginBottom: 8 }}>
              EVALUATION CRITERIA
            </div>

            <div className="criteria-list">
              {[
                ["◆", "Accuracy Score", "Historical post accuracy, weighted by severity"],
                ["⚑", "Breaking Speed", "Time-to-first-report vs other sources"],
                ["◉", "Source Quality", "Evidence grade: satellite, AIS, intercepts, OSINT"],
                ["▣", "Track Record", "90+ days active, 50+ verified posts minimum"],
              ].map(([icon, label, text], i) => (
                <div key={i} className="criteria-item">
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--accent)" }}>{icon}</span>
                  <div>
                    <strong style={{ color: "var(--text)", fontSize: 11 }}>{label}</strong>
                    <br />{text}
                  </div>
                </div>
              ))}
            </div>

            {[
              ["Channel / Organization Name", "e.g. AltitudeSentinel", "channel", "text"],
              ["Primary Handle / Account", "@yourhandle", "handle", "text"],
            ].map(([label, ph, key]) => (
              <div key={key} className="form-group">
                <label className="form-label">{label}</label>
                <input
                  className="form-input"
                  placeholder={ph}
                  value={form[key]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                />
              </div>
            ))}

            {[
              ["Portfolio / Past Work", "Link to notable OSINT threads...", "portfolio"],
              ["Why should you be approved?", "Describe your methodology...", "why"],
            ].map(([label, ph, key]) => (
              <div key={key} className="form-group">
                <label className="form-label">{label}</label>
                <textarea
                  className="form-input form-ta"
                  placeholder={ph}
                  value={form[key]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                />
              </div>
            ))}

            <div className="modal-actions">
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn primary" onClick={handleSubmit}>Submit Application</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}