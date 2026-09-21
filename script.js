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
