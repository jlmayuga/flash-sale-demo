import useCountdown from '../../hooks/useCountdown.js'

const pad = (value) => String(value).padStart(2, '0')

export default function Countdown({ targetTime, expiredLabel }) {
  const { hours, minutes, seconds, expired } = useCountdown(targetTime)

  if (expired) {
    return <span className="countdown countdown--ended">{expiredLabel}</span>
  }

  return (
    <div
      className="countdown"
      aria-label={`${hours} hours, ${minutes} minutes, ${seconds} seconds left`}
    >
      <span>
        <strong>{pad(hours)}</strong>
        <small>hrs</small>
      </span>
      <b>:</b>
      <span>
        <strong>{pad(minutes)}</strong>
        <small>min</small>
      </span>
      <b>:</b>
      <span>
        <strong>{pad(seconds)}</strong>
        <small>sec</small>
      </span>
    </div>
  )
}
