import { useEffect, useState } from 'react'

function getTimeLeft(endTime) {
  const difference = Math.max(0, new Date(endTime).getTime() - Date.now())
  const totalSeconds = Math.floor(difference / 1000)

  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: difference === 0,
  }
}

export default function useCountdown(endTime) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(endTime))

  useEffect(() => {
    setTimeLeft(getTimeLeft(endTime))
    const timer = window.setInterval(
      () => setTimeLeft(getTimeLeft(endTime)),
      1000,
    )
    return () => window.clearInterval(timer)
  }, [endTime])

  return timeLeft
}
