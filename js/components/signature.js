// Signature capture pad. Port of the Compose SignaturePad + its serialisation.
// The on-disk format is unchanged ("x y" points, "," between points, "|"
// between strokes) so signatures round-trip with the Android app.

export function serializeSignature(strokes) {
  if (!strokes.length) return '';
  return strokes
    .map((stroke) => stroke.map((p) => `${p.x} ${p.y}`).join(','))
    .join('|');
}

export function deserializeSignature(data) {
  if (!data || !data.trim()) return [];
  try {
    return data.split('|').map((strokeStr) =>
      strokeStr.split(',').map((pointStr) => {
        const [x, y] = pointStr.trim().split(' ');
        return { x: parseFloat(x), y: parseFloat(y) };
      }).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
    ).filter((s) => s.length > 0);
  } catch (_) {
    return [];
  }
}

/** Renders the stored strokes as an SVG path set, scaled to fit width x height. */
export function signatureSvg(data, width, height, pad = 6) {
  const strokes = deserializeSignature(data);
  if (!strokes.length) return '';

  const all = strokes.flat();
  const minX = Math.min(...all.map((p) => p.x));
  const maxX = Math.max(...all.map((p) => p.x));
  const minY = Math.min(...all.map((p) => p.y));
  const maxY = Math.max(...all.map((p) => p.y));
  const srcW = Math.max(maxX - minX, 1);
  const srcH = Math.max(maxY - minY, 1);
  const factor = Math.min((width - 2 * pad) / srcW, (height - 2 * pad) / srcH);
  const offX = pad + ((width - 2 * pad) - srcW * factor) / 2;
  const offY = pad + ((height - 2 * pad) - srcH * factor) / 2;

  const paths = strokes.map((stroke) => {
    const pts = stroke.map((p) => `${(offX + (p.x - minX) * factor).toFixed(1)},${(offY + (p.y - minY) * factor).toFixed(1)}`);
    if (pts.length === 1) {
      const [x, y] = pts[0].split(',');
      return `<circle cx="${x}" cy="${y}" r="1.2" fill="#1A232B"/>`;
    }
    return `<polyline points="${pts.join(' ')}" fill="none" stroke="#1A232B" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  });

  return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${paths.join('')}</svg>`;
}

/**
 * Attaches drawing behaviour to a <canvas>.
 * @param {HTMLCanvasElement} canvas
 * @param {string} initialData serialised strokes
 * @param {(data: string) => void} onChange called when a stroke finishes
 */
export function attachSignaturePad(canvas, initialData, onChange) {
  let strokes = deserializeSignature(initialData);
  let current = [];
  let drawing = false;

  const ctx = canvas.getContext('2d');

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }

  function redraw() {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width || canvas.width, rect.height || canvas.height);
    ctx.strokeStyle = '#1A232B';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const stroke of [...strokes, current]) {
      if (stroke.length === 1) {
        ctx.beginPath();
        ctx.arc(stroke[0].x, stroke[0].y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#1A232B';
        ctx.fill();
      } else if (stroke.length > 1) {
        ctx.beginPath();
        ctx.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
        ctx.stroke();
      }
    }
    canvas.parentElement?.classList.toggle('is-empty', strokes.length === 0 && current.length === 0);
  }

  const pointFrom = (e) => {
    const rect = canvas.getBoundingClientRect();
    return { x: +(e.clientX - rect.left).toFixed(1), y: +(e.clientY - rect.top).toFixed(1) };
  };

  canvas.addEventListener('pointerdown', (e) => {
    drawing = true;
    canvas.setPointerCapture(e.pointerId);
    current = [pointFrom(e)];
    redraw();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    e.preventDefault();
    current.push(pointFrom(e));
    redraw();
  });

  const finish = () => {
    if (!drawing) return;
    drawing = false;
    if (current.length) {
      strokes = [...strokes, current];
      current = [];
      onChange(serializeSignature(strokes));
    }
    redraw();
  };

  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', () => { drawing = false; current = []; redraw(); });
  canvas.addEventListener('pointerleave', finish);

  // Lay out once the element has a size, then track viewport changes.
  requestAnimationFrame(resize);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  return {
    clear() {
      strokes = [];
      current = [];
      onChange('');
      redraw();
    },
    isEmpty: () => strokes.length === 0,
    destroy: () => observer.disconnect(),
  };
}
