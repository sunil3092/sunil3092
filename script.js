/* Content comes from content.json: build.js embeds what this script
   needs in <script id="site-data">. */
var SITE = (function () {
  var el = document.getElementById("site-data");
  try {
    return el ? JSON.parse(el.textContent) : null;
  } catch (e) {
    return null;
  }
})();

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

  if (!SITE) return;
  var started = SITE.experience.startedWorking.split("-");
  var startDate = new Date(+started[0], +started[1] - 1, 1);
  var currentDate = new Date();
  var diffMs = currentDate - startDate;
  var totalYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  var experienceYears = Math.max(
    0,
    totalYears - SITE.experience.yearsOffForStudy,
  );
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
   Timeline landmark carousels

   Every timeline card names its city in data-city and cycles through all
   the landmarks drawn for that city, so a new job in a known city needs
   no new art. All cards in a city share one clock and advance together,
   each offset from the others, so no two of them ever show the same
   landmark. Hovering a card pauses its city's clock for the same reason.
   ------------------------------------------------------------------ */

(function () {
  if (!SITE) return;
  // cities.<key>.landmarks in content.json: [{ image, name }, ...]
  var CITIES = SITE.cities;
  var LANDMARKS = {};
  Object.keys(CITIES).forEach(function (key) {
    LANDMARKS[key] = CITIES[key].landmarks;
  });

  var INTERVAL = 4000; // ms each landmark is shown

  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  var cities = {};
  var figures = [].filter.call(
    document.querySelectorAll(".timeline-place[data-city]"),
    function (figure) {
      // Unknown city: keep whatever the markup shows.
      return LANDMARKS[figure.getAttribute("data-city")];
    },
  );

  // First pass: note which landmarks the markup already assigns, so a
  // card without one can't claim a landmark a later card is using.
  figures.forEach(function (figure) {
    var city = figure.getAttribute("data-city");
    if (!cities[city]) cities[city] = { cards: [], used: {}, tick: 0, holds: 0 };
    var index = markupIndex(figure, LANDMARKS[city]);
    if (index >= 0) cities[city].used[index] = true;
  });
  figures.forEach(function (figure) {
    var city = figure.getAttribute("data-city");
    cities[city].cards.push(build(figure, city, cities[city]));
  });

  if (reduceMotion) return;

  // One clock per city; cities are offset so the whole timeline never
  // moves at the same instant.
  Object.keys(cities).forEach(function (name, i) {
    var state = cities[name];
    if (LANDMARKS[name].length < 2) return;
    window.setTimeout(function () {
      window.setInterval(function () {
        if (state.holds > 0 || document.hidden) return;
        state.tick += 1;
        state.cards.forEach(function (card) {
          show(card, state.tick % card.len, card.onScreen);
        });
      }, INTERVAL);
    }, (i * INTERVAL) / Object.keys(cities).length);
  });

  function build(figure, city, state) {
    var list = LANDMARKS[city];

    // Start on the landmark already in the markup; a card without one
    // takes the first landmark no other card in this city is using.
    var start = markupIndex(figure, list);
    for (var i = 0; start < 0 && i < list.length; i += 1) {
      if (!state.used[i]) start = i;
    }
    if (start < 0) start = state.cards.length % list.length;
    state.used[start] = true;

    var slides = list.slice(start).concat(list.slice(0, start));

    var frame = document.createElement("div");
    frame.className = "place-frame";
    var track = document.createElement("div");
    track.className = "place-track";
    // A copy of the first slide at the end lets the loop wrap seamlessly.
    slides.concat([slides[0]]).forEach(function (landmark) {
      var img = document.createElement("img");
      img.src = "assets/landmarks/" + landmark.image;
      img.width = 64;
      img.height = 40;
      img.alt = "";
      img.decoding = "async";
      track.appendChild(img);
    });
    frame.appendChild(track);

    var caption =
      figure.querySelector("figcaption") ||
      document.createElement("figcaption");
    figure.textContent = "";
    figure.appendChild(frame);
    figure.appendChild(caption);

    var card = {
      track: track,
      caption: caption,
      slides: slides,
      len: slides.length,
      city: city,
      visual: 0,
      onScreen: true,
    };
    caption.textContent = label(card, 0);

    // Hold the whole city still while any of its cards is being read.
    var hoverTarget = figure.closest(".timeline-item") || figure;
    hoverTarget.addEventListener("mouseenter", function () {
      state.holds += 1;
    });
    hoverTarget.addEventListener("mouseleave", function () {
      state.holds -= 1;
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        card.onScreen = entries[0].isIntersecting;
      }).observe(figure);
    }

    // After sliding onto the copy of the first slide, jump back to the
    // real one with no transition, so the loop never visibly rewinds.
    track.addEventListener("transitionend", function () {
      if (card.visual === card.len) show(card, 0, false);
    });

    return card;
  }

  // Position in the city's list of the landmark the markup shows, or -1.
  function markupIndex(figure, list) {
    var img = figure.querySelector("img");
    var match = img && img.getAttribute("src").match(/([^/]+)$/);
    for (var i = 0; match && i < list.length; i += 1) {
      if (list[i].image === match[1]) return i;
    }
    return -1;
  }

  function label(card, index) {
    return card.slides[index].name + ", " + CITIES[card.city].name;
  }

  // Slide one step forward, or jump straight there when off screen.
  function show(card, target, animate) {
    if (animate) {
      card.visual = target === 0 ? card.len : target;
    } else {
      card.track.style.transition = "none";
      card.visual = target;
    }
    card.track.style.transform = "translateX(" + -card.visual * 100 + "%)";
    if (!animate) {
      void card.track.offsetWidth;
      card.track.style.transition = "";
    }
    card.caption.textContent = label(card, target);
  }
})();

/* ------------------------------------------------------------------
   Console greeting

   Logged at load rather than on a devtools-open check: every way of
   detecting devtools is a hack with false positives, and browsers keep
   messages logged before devtools opened, so this is already waiting.
   ------------------------------------------------------------------ */

(function () {
  if (typeof console === "undefined" || !console.log || !SITE) return;

  var slab =
    "font-family: Archivo, Helvetica, Arial, sans-serif;" +
    "font-weight: 900; font-size: 26px; letter-spacing: 1px;" +
    "padding: 8px 18px; line-height: 1.6;";
  var body =
    "font-family: Archivo, Helvetica, Arial, sans-serif;" +
    "font-size: 13px; line-height: 1.8;";

  console.log(
    "%c" + SITE.profile.firstName.toUpperCase(),
    slab + "background:#f1c40f; color:#212436;",
  );
  console.log(
    "%c" + SITE.profile.lastName.toUpperCase(),
    slab + "background:#bd098e; color:#ffffff;",
  );
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
      console.log("Email     " + SITE.contact.email);
      console.log("LinkedIn  " + SITE.contact.linkedin);
      console.log("GitHub    " + SITE.contact.github);
      console.log("Location  " + SITE.profile.location);
    },
  };
})();
