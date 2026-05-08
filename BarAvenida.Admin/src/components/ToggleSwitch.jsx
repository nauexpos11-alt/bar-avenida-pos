import './ToggleSwitch.css'

export default function ToggleSwitch({ checked, onChange, label, disabled = false }) {
  return (
    <label className={`toggle-switch${disabled ? ' disabled' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="toggle-track">
        <span className="toggle-thumb" />
      </span>
      {label && <span className="toggle-label">{label}</span>}
    </label>
  )
}
