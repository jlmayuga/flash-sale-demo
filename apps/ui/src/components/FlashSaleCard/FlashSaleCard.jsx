import Countdown from '../Countdown/Countdown.jsx'
import useCountdown from '../../hooks/useCountdown.js'

const startTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export default function FlashSaleCard({ sale, position, onClaim }) {
  const { expired: hasStarted } = useCountdown(sale.startsAt)
  const { expired: hasEnded } = useCountdown(sale.endsAt)
  const sold = sale.totalStock - sale.remainingStock
  const soldPercentage = sale.totalStock
    ? Math.round((sold / sale.totalStock) * 100)
    : 0
  const urgency = sale.remainingStock <= Math.max(5, sale.totalStock * 0.15)
  const soldOut = sale.remainingStock <= 0
  const upcoming = !hasStarted
  const ended = hasEnded
  const unavailable = upcoming || soldOut || ended
  const saleStatus = upcoming
    ? 'Upcoming'
    : ended
      ? 'Ended'
      : soldOut
        ? 'Sold out'
        : 'Live now'
  const countdownTarget = upcoming ? sale.startsAt : sale.endsAt

  return (
    <article className="sale-card">
      <div
        className="sale-card__visual"
        aria-hidden="true"
      >
        <span className="sale-card__number">
          {String(position).padStart(2, '0')}
        </span>
        <div className="sale-card__orb" />
        <span
          className={`sale-card__badge${unavailable ? ' sale-card__badge--sold-out' : ''}`}
        >
          {saleStatus}
        </span>
      </div>

      <div className="sale-card__body">
        <div>
          <p className="eyebrow">Limited release · {sale.id}</p>
          <h2>{sale.productName}</h2>
        </div>

        <div className="sale-card__timer">
          <span>{upcoming ? 'Sale starts in' : 'Offer closes in'}</span>
          <Countdown
            targetTime={countdownTarget}
            expiredLabel={ended ? 'Sale ended' : 'Starting now'}
          />
          {upcoming && (
            <p className="sale-card__availability">
              Available {startTimeFormatter.format(new Date(sale.startsAt))}
            </p>
          )}
        </div>

        <div className="stock">
          <div className="stock__labels">
            <span>
              {upcoming
                ? 'Not started'
                : ended
                  ? 'Sale ended'
                  : soldOut
                    ? 'Sold out'
                    : urgency
                      ? 'Almost gone'
                      : 'Selling fast'}
            </span>
            <strong>
              {sale.remainingStock} of {sale.totalStock} left
            </strong>
          </div>
          <div
            className="stock__track"
            aria-label={`${soldPercentage}% sold`}
          >
            <span style={{ width: `${soldPercentage}%` }} />
          </div>
          <p className="claim-limit">
            Limit {sale.limitClaim} {sale.limitClaim === 1 ? 'claim' : 'claims'}{' '}
            per customer
          </p>
        </div>

        <button
          type="button"
          className="sale-card__button"
          onClick={() => onClaim(sale)}
          disabled={unavailable}
        >
          {upcoming
            ? 'Coming soon'
            : ended
              ? 'Sale ended'
              : soldOut
                ? 'Sold out'
                : 'Buy now'}{' '}
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </article>
  )
}
