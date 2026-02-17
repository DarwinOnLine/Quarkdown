// Optional visual effects

/** Cursor dot that follows the mouse */
export function initCursorDot(selector = '#cursorDot') {
  const dot = document.querySelector(selector);
  if (!dot) return;

  document.addEventListener('mousemove', (e) => {
    dot.style.left = e.clientX - 6 + 'px';
    dot.style.top = e.clientY - 6 + 'px';
  });
  document.addEventListener('mousedown', () => { dot.style.transform = 'scale(2)'; });
  document.addEventListener('mouseup', () => { dot.style.transform = 'scale(1)'; });
}

/** Starfield 404 page with warp effect */
export function initStarfield(canvas, { onWarp, router } = {}) {
  if (!canvas) return;

  const c = canvas.getContext('2d');
  const numStars = 1900;
  const radius = '0.' + Math.floor(Math.random() * 9) + 1;
  let focalLength = canvas.width * 2;
  let centerX, centerY;
  let stars = [];
  let animate = true;

  const initializeStars = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    centerX = canvas.width / 2;
    centerY = canvas.height / 2;
    focalLength = canvas.width * 2;

    stars = [];
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: Math.random() * canvas.width,
        o: '0.' + Math.floor(Math.random() * 99) + 1
      });
    }
  };

  const moveStars = () => {
    for (let i = 0; i < numStars; i++) {
      stars[i].z--;
      if (stars[i].z <= 0) stars[i].z = canvas.width;
    }
  };

  const drawStars = () => {
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      initializeStars();
    }

    c.fillStyle = 'rgba(0,10,20,1)';
    c.fillRect(0, 0, canvas.width, canvas.height);

    c.fillStyle = 'rgba(209, 255, 255, ' + radius + ')';
    for (let i = 0; i < numStars; i++) {
      const star = stars[i];
      const pixelX = (star.x - centerX) * (focalLength / star.z) + centerX;
      const pixelY = (star.y - centerY) * (focalLength / star.z) + centerY;
      const pixelRadius = 1 * (focalLength / star.z);

      c.fillRect(pixelX, pixelY, pixelRadius, pixelRadius);
      c.fillStyle = 'rgba(209, 255, 255, ' + star.o + ')';
    }
  };

  const executeFrame = () => {
    if (animate) {
      const id = requestAnimationFrame(executeFrame);
      if (router) router.trackAnimation(id);
    }
    moveStars();
    drawStars();
  };

  initializeStars();
  executeFrame();

  // Return warp trigger function
  return function triggerWarp(callback) {
    let warpSpeed = 0;

    const accel = setInterval(() => {
      warpSpeed = Math.min(warpSpeed + 2, 120);
    }, 30);

    animate = false;

    const warpDraw = () => {
      const id = requestAnimationFrame(warpDraw);
      if (router) router.trackAnimation(id);

      for (let j = 0; j < numStars; j++) {
        stars[j].z -= warpSpeed;
        if (stars[j].z <= 0) stars[j].z = canvas.width;
      }

      c.fillStyle = 'rgba(0, 10, 20, 0.15)';
      c.fillRect(0, 0, canvas.width, canvas.height);

      for (let j = 0; j < numStars; j++) {
        const s = stars[j];
        const x = (s.x - centerX) * (focalLength / s.z) + centerX;
        const y = (s.y - centerY) * (focalLength / s.z) + centerY;
        const prevZ = s.z + warpSpeed * 0.6;
        const px = (s.x - centerX) * (focalLength / prevZ) + centerX;
        const py = (s.y - centerY) * (focalLength / prevZ) + centerY;
        const brightness = Math.min(1, warpSpeed / 40);
        const alpha = parseFloat(s.o) * (0.5 + brightness * 0.5);

        c.strokeStyle = 'rgba(209, 255, 255, ' + alpha + ')';
        c.lineWidth = Math.max(1, 2 * (focalLength / s.z / 100));
        c.beginPath();
        c.moveTo(px, py);
        c.lineTo(x, y);
        c.stroke();
      }
    };

    warpDraw();

    setTimeout(() => {
      clearInterval(accel);
      const flash = document.createElement('div');
      flash.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:10000;opacity:0;transition:opacity 0.15s';
      document.body.appendChild(flash);
      requestAnimationFrame(() => { flash.style.opacity = '1'; });
      setTimeout(() => {
        flash.remove();
        if (callback) callback();
      }, 200);
    }, 1200);
  };
}
