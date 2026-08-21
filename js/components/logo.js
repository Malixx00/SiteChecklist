// Australian Turntables brand mark.
//
// The three concentric ring paths below were extracted as exact vectors from
// the EPS artwork embedded in "ATT - BRAND STYLEGUIDE UPDATE 2025 v1.1.pdf"
// (page 2, Master Logo). They are the real logo, not a redraw - do not edit
// the path data. Colours are the brand-guide hex values (page 8).
//
// The full primary lockup lives in icons/at-logo.svg and is used via <img>
// where a fixed-colour logo is correct (the launch screen).

const RINGS = [
  { colour: '#425563', d: 'M50 100C22.43 100 0 77.57 0 50C0 22.43 22.43 0 50 0C77.57 0 99.999 22.43 99.999 50C99.999 63.356 94.798 75.912 85.353 85.355L77.403 77.403C84.723 70.085 88.755 60.352 88.755 50C88.755 28.63 71.369 11.244 50 11.244C28.63 11.244 11.244 28.63 11.244 50C11.244 71.369 28.63 88.755 50 88.755L50 100Z' },
  { colour: '#0076A8', d: 'M50 85.207L50 73.963C63.213 73.963 73.963 63.212 73.963 50C73.963 36.787 63.213 26.036 50 26.036C36.787 26.036 26.036 36.787 26.036 50C26.036 56.401 28.529 62.418 33.055 66.944L25.105 74.895C18.454 68.246 14.793 59.404 14.793 50C14.793 30.586 30.586 14.792 50 14.792C69.413 14.792 85.207 30.586 85.207 50C85.207 69.413 69.413 85.207 50 85.207Z' },
  { colour: '#888B8D', d: 'M50 70.414C38.743 70.414 29.585 61.256 29.585 50C29.585 38.743 38.743 29.585 50 29.585C61.256 29.585 70.414 38.743 70.414 50C70.414 55.454 68.289 60.58 64.434 64.435L56.483 56.483C58.217 54.751 59.17 52.449 59.17 50C59.17 44.943 55.056 40.829 50 40.829C44.943 40.829 40.829 44.943 40.829 50C40.829 55.056 44.943 59.17 50 59.17L50 70.414Z' },
];

/**
 * Inline symbol markup.
 * @param {'colour'|'mono'} variant `mono` inherits currentColor, for use on the
 *   Independence top bar and other dark grounds (style guide page 5/6).
 * @param {string} cls extra classes for the <svg>
 */
export function symbolSvg(variant = 'colour', cls = '') {
  const paths = RINGS.map((r) =>
    `<path fill="${variant === 'mono' ? 'currentColor' : r.colour}" d="${r.d}"/>`).join('');
  return `<svg class="brandmark ${cls}" viewBox="0 0 100 100" role="img"
    aria-label="Australian Turntables" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`;
}

/** The full primary lockup, for light backgrounds with room for it. */
export function lockupImg(cls = '') {
  return `<img class="brandlockup ${cls}" src="icons/at-logo.svg"
    alt="Australian Turntables" width="445" height="100">`;
}
