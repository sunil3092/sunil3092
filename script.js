document.addEventListener("DOMContentLoaded", function () {
  /* ---------- Theme toggle ----------
     The theme itself is applied by the inline script in <head> before
     first paint; this only wires up the control and persists changes. */

  var root = document.documentElement;
  var toggle = document.getElementById("theme-toggle");
  var toggleLabel = document.getElementById("theme-toggle-label");

  function readTheme() {
    return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function paintToggle(theme) {
    if (!toggle) return;
    var goingToDark = theme === "light";
    // The control is labelled with the theme it switches to.
    if (toggleLabel) toggleLabel.textContent = goingToDark ? "Dark" : "Light";
    toggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    toggle.setAttribute(
      "aria-label",
      goingToDark ? "Switch to dark theme" : "Switch to light theme",
    );
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    paintToggle(theme);
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {
      // Private mode or blocked storage: the theme still applies for
      // this page view, it just will not be remembered.
    }
  }

  paintToggle(readTheme());

  if (toggle) {
    toggle.addEventListener("click", function () {
      applyTheme(readTheme() === "dark" ? "light" : "dark");
    });
  }

  // Follow the OS while the visitor has not made an explicit choice.
  var media = window.matchMedia("(prefers-color-scheme: dark)");
  var onSystemChange = function (event) {
    var stored = null;
    try {
      stored = localStorage.getItem("theme");
    } catch (e) {}
    if (stored) return;
    var theme = event.matches ? "dark" : "light";
    root.setAttribute("data-theme", theme);
    paintToggle(theme);
  };

  if (media.addEventListener) {
    media.addEventListener("change", onSystemChange);
  } else if (media.addListener) {
    media.addListener(onSystemChange);
  }

  /* ---------- Experience counter ---------- */

  var startDate = new Date(2019, 2, 1); // March 2019 (month index 2)
  var currentDate = new Date();
  var diffMs = currentDate - startDate;
  var totalYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  var experienceYears = Math.max(0, totalYears - 1); // less the master's study period
  var nextYearValue = Math.ceil(experienceYears);
  var progressPercent = Math.round(
    (experienceYears - Math.floor(experienceYears)) * 100,
  );

  var experienceYearsText = document.getElementById("experience-years");
  if (experienceYearsText) {
    experienceYearsText.textContent = experienceYears.toFixed(1);
  }

  var nextYearText = document.getElementById("next-year-text");
  if (nextYearText) {
    nextYearText.textContent = nextYearValue + ".0 y";
  }

  var experienceProgressText = document.getElementById(
    "experience-progress-text",
  );
  if (experienceProgressText) {
    experienceProgressText.textContent = progressPercent + "%";
  }

  var experienceProgressFill = document.getElementById(
    "experience-progress-fill",
  );
  if (experienceProgressFill) {
    experienceProgressFill.style.width = progressPercent + "%";
  }
});

/* ------------------------------------------------------------------
   Pixel scene intro

   Adapted from Benjamin Chu's pixel-animation-js (CC0,
   github.com/nyanSpark/pixel-animation-js): every pixel starts somewhere
   random in a random colour, slides across to its column, takes its
   real colour, then drops into place. Rewritten to move SVG rects so
   the finished scene keeps following the theme toggle, and to run once
   rather than flicker forever. The CSS loops take over when it ends.
   ------------------------------------------------------------------ */

(function () {
  var scene = document.querySelector(".pixel-scene");
  if (!scene) return;

  function reveal() {
    scene.classList.add("is-assembled");
  }

  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (reduceMotion || !window.requestAnimationFrame) {
    reveal();
    return;
  }

  var SVG_NS = "http://www.w3.org/2000/svg";
  var DURATION = 900; // ms per pixel: first half across, second half down
  var MAX_DELAY = 450; // ms of random stagger between pixels
  var SCATTER_COLOURS = [
    "var(--blue)",
    "var(--magenta)",
    "var(--red)",
    "var(--yellow)",
  ];

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function randomInt(max) {
    return Math.floor(Math.random() * max);
  }

  // Flatten the scene into one entry per grid cell, keeping whichever
  // rect paints last there, so overlapping shapes don't double up.
  function collectCells() {
    var cells = {};
    var keys = [];
    var rects = scene.querySelectorAll("rect");

    for (var i = 0; i < rects.length; i += 1) {
      var rect = rects[i];
      // Steam starts invisible, so it has no resting pixels to land.
      if (rect.classList.contains("px-steam")) continue;

      var group = rect.parentNode;
      var fill =
        rect.getAttribute("fill") ||
        (group.getAttribute && group.getAttribute("fill"));
      var opacity =
        (group.getAttribute && group.getAttribute("opacity")) || "1";
      var x0 = +rect.getAttribute("x");
      var y0 = +rect.getAttribute("y");
      var w = +rect.getAttribute("width");
      var h = +rect.getAttribute("height");

      for (var x = x0; x < x0 + w; x += 1) {
        for (var y = y0; y < y0 + h; y += 1) {
          var key = x + "," + y;
          if (!(key in cells)) keys.push(key);
          cells[key] = { x: x, y: y, fill: fill, opacity: opacity };
        }
      }
    }

    return keys.map(function (key) {
      return cells[key];
    });
  }

  function assemble() {
    var view = scene.viewBox.baseVal;
    var layer = document.createElementNS(SVG_NS, "g");
    layer.setAttribute("class", "px-assembly");

    var particles = collectCells().map(function (cell) {
      var el = document.createElementNS(SVG_NS, "rect");
      var sx = randomInt(view.width);
      var sy = randomInt(view.height);
      el.setAttribute("x", sx);
      el.setAttribute("y", sy);
      el.setAttribute("width", 1);
      el.setAttribute("height", 1);
      el.setAttribute(
        "fill",
        SCATTER_COLOURS[randomInt(SCATTER_COLOURS.length)],
      );
      layer.appendChild(el);

      return {
        el: el,
        sx: sx,
        sy: sy,
        cell: cell,
        delay: Math.random() * MAX_DELAY,
        coloured: false,
      };
    });

    scene.appendChild(layer);

    var start = null;

    function frame(now) {
      if (start === null) start = now;
      var elapsed = now - start;
      var running = false;

      for (var i = 0; i < particles.length; i += 1) {
        var p = particles[i];
        // Landed pixels are final; skip them rather than rewrite
        // thousands of unchanged positions every frame.
        if (p.settled) continue;

        var t = (elapsed - p.delay) / DURATION;
        if (t < 1) running = true;
        else p.settled = true;
        t = Math.min(Math.max(t, 0), 1);

        var x;
        var y;
        if (t < 0.5) {
          x = p.sx + (p.cell.x - p.sx) * easeOut(t / 0.5);
          y = p.sy;
        } else {
          x = p.cell.x;
          y = p.sy + (p.cell.y - p.sy) * easeOut((t - 0.5) / 0.5);
          if (!p.coloured) {
            p.el.setAttribute("fill", p.cell.fill);
            p.el.setAttribute("opacity", p.cell.opacity);
            p.coloured = true;
          }
        }

        // Rounded so pixels move on the grid, never between cells.
        p.el.setAttribute("x", Math.round(x));
        p.el.setAttribute("y", Math.round(y));
      }

      if (running) {
        window.requestAnimationFrame(frame);
      } else {
        layer.remove();
        reveal();
      }
    }

    window.requestAnimationFrame(frame);
  }

  function start() {
    try {
      assemble();
    } catch (e) {
      // Never leave the panel empty because the intro failed.
      reveal();
    }
  }

  // On narrow screens the panel sits below the fold, so wait until it
  // is actually on screen rather than playing it to nobody.
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          start();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(scene);
  } else {
    start();
  }
})();

/* ------------------------------------------------------------------
   Console greeting

   Logged at load rather than on a devtools-open check: every way of
   detecting devtools is a hack with false positives, and browsers keep
   messages logged before devtools opened, so this is already waiting.
   ------------------------------------------------------------------ */

(function () {
  if (typeof console === "undefined" || !console.log) return;

  var slab =
    "font-family: Archivo, Helvetica, Arial, sans-serif;" +
    "font-weight: 900; font-size: 26px; letter-spacing: 1px;" +
    "padding: 8px 18px; line-height: 1.6;";
  var body =
    "font-family: Archivo, Helvetica, Arial, sans-serif;" +
    "font-size: 13px; line-height: 1.8;";

  console.log("%cSUNIL", slab + "background:#f1c40f; color:#212436;");
  console.log("%cGAUDA", slab + "background:#bd098e; color:#ffffff;");
  console.log(
    "%cReading the source? Good instinct.\nType %csunil.hire()%c if you like what you see.",
    body + "color:#4458a0; font-weight:600;",
    body + "color:#bd098e; font-weight:700;",
    body + "color:#4458a0; font-weight:600;",
  );

  // Exists only to defeat DevTools' eager evaluation. While you type an
  // expression, DevTools runs it to preview the result, and V8 counts
  // console calls as side-effect free — so the details printed before
  // Enter was pressed. Writing to this counter is a genuine side effect,
  // which makes V8 abandon the preview and wait for the real command.
  var timesAsked = 0;

  window.sunil = {
    hire: function () {
      timesAsked += 1;

      console.log(
        "%cLet's talk.",
        body + "color:#cd2d48; font-weight:700; font-size:15px;",
      );
      console.log("Email     sunilg3011992@gmail.com");
      console.log("LinkedIn  https://www.linkedin.com/in/sunil3092");
      console.log("GitHub    https://github.com/sunil3092");
      console.log("Location  Dublin, Ireland");
    },
  };
})();
