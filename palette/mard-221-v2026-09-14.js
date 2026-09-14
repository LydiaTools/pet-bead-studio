/*
 * Frozen display-reference palette for one purchasable target only:
 * MARD 2.6 mm / 221-colour code system (A-H, M).
 *
 * RGB values are a versioned screen-matching reference, not a physical-colour
 * measurement. See palette/MARD-221-SOURCES.md before making a purchase claim.
 */
const MARD_221 = (() => {
  const groups = { A: 26, B: 32, C: 29, D: 26, E: 24, F: 25, G: 21, H: 23, M: 15 };
  const rgbBytes = Uint8Array.from(atob('+vXN/P7W/P+S9+xc8Ng6/alR+oxP+9pN951f9H44/tuZ/aJ2/sZn91hC+/Ze/v+X/eFz/L+A/X53+dZm+uOT7fh45Mi68/ap/feF/8c03/E7ZPNDofWGX980OeFYZOCkPq58HZtUKlA3mtG6YnAyGm49yOh9q+hPMFM1wO2cnrM+5u1PJreOy+zPGGFqCkJBNDsa6PqmToRtkHw10OCvnuW7xt9f4/uxtOaRkq1g8P7kq/j+ouD3RM37BqrfVKfpOXfKD1K9M0nDPLzjKt7THjNOzef+1fz3IcXEGFiiAtHzITJEGIadGnCpvN38a7G7yOL9fsX5qejgQq3P0N75vc7oNkqJrLfvho3TNVSvFi17s07Gs3vch1ip49L+1bn0MBpJvrni3JnOtQONhimTLx+M4uTwx9P5mmS42MLZmjWtlAWVODia6tv4dorhSVDC1sbr9tTL/MHd9r3o6GSe8Faf60FyxTZ0/dvp43bH0TuV99rU9pO/tQJq+tS/9cnK+/Ts9+Ps+cjb9rvR18bOwJ2ks4yfk32K3r7l/pOB9j1L7k4++ypA4QMokTY1kRkyuwEm4Gd6h0YoWSMj81Nr9FxF/K2y1QUn+MCp6Jt90H9KvkVKxpSV8rjG98PQ7YBs4J2v6EhU/+TT/Mas8cSl3LOH57NO46AUmFw6cT0v5LaF2oxC2siY/smTsnFLi2hM9vjj8tjBd1RO/+PV3X1BpUUvs4Vh////+/v7tLS0h4eHRkZILCwsAQEB59bc7+3u6+vrzc3N/fbu9O3xztfUmqamGxIT8O7v/P/28u7llqCf+PvmysrSm5yUu8a2kJmUaX6B4NS80cyvsKqGsKeWroCCpohixLO7nXaTZEtRx5JmwnVjdH16'), c => c.charCodeAt(0));
  const codes = Object.entries(groups).flatMap(([group, count]) => Array.from({ length: count }, (_, i) => `${group}${i + 1}`));
  const hex = rgb => `#${rgb.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  return {
    id: 'mard-221-alfonse-doudou-v2026-09-14',
    brand: 'MARD', series: '221 色（A-H、M）', beadSizeMm: 2.6,
    paletteSourceSha256: '556a7e0098c0055bde47f78d430cc7d36cb3788c235f0238e6a610f64a46b0bf',
    colors: codes.map((code, i) => {
      const rgb = [...rgbBytes.slice(i * 3, i * 3 + 3)];
      return { code, name: `MARD ${code}（公开色表未提供独立中文色名）`, group: code[0], rgb, hex: hex(rgb) };
    })
  };
})();
