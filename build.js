#!/usr/bin/env node
/*
  Builds the site from content.json into _site/.

    node build.js

  Fills src/template.html with the content, copies the static files
  alongside it, and checks the content first: a mistake in content.json
  stops the build with a message saying what to fix, rather than
  publishing a broken page. Uses only Node's built-in modules.
*/
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT = path.join(ROOT, "_site");
const TEMPLATE = path.join(ROOT, "src", "template.html");
const CONTENT = path.join(ROOT, "content.json");
const STATIC_FILES = ["style.css", "script.js", "assets"];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function stop(problems) {
  console.error("Build stopped. Fix these in content.json:\n");
  problems.forEach((p) => console.error("  - " + p));
  console.error("");
  process.exit(1);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ------------------------------------------------------------ load + check

function loadContent() {
  let text;
  try {
    text = fs.readFileSync(CONTENT, "utf8");
  } catch (e) {
    stop(["content.json could not be read: " + e.message]);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    stop(["content.json is not valid JSON: " + e.message +
      " (often a missing comma or a trailing comma)"]);
  }
}

function check(content) {
  const problems = [];
  const text = (value, where) => {
    if (typeof value !== "string" || value.trim() === "") {
      problems.push(where + " must be some text");
    }
  };
  const list = (value, where) => {
    if (!Array.isArray(value) || value.length === 0) {
      problems.push(where + " must be a list with at least one entry");
      return [];
    }
    return value;
  };
  const obj = (value) => (value && typeof value === "object" ? value : {});

  const site = obj(content.site);
  text(site.title, "site.title");
  text(site.description, "site.description");

  const profile = obj(content.profile);
  ["firstName", "lastName", "role", "location", "photo", "bio"].forEach((k) =>
    text(profile[k], "profile." + k),
  );

  const contact = obj(content.contact);
  ["github", "linkedin", "email"].forEach((k) =>
    text(contact[k], "contact." + k),
  );

  const experience = obj(content.experience);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(experience.startedWorking || "")) {
    problems.push('experience.startedWorking must look like "2019-03"');
  }
  if (typeof experience.yearsOffForStudy !== "number" ||
      experience.yearsOffForStudy < 0) {
    problems.push("experience.yearsOffForStudy must be a number, 0 or more");
  }

  list(content.skills, "skills").forEach((skill, i) => {
    const where = "skills[" + i + "]";
    text(obj(skill).name, where + ".name");
    text(obj(skill).icon, where + ".icon");
    if (skill && skill.icon && !fs.existsSync(path.join(ROOT, "assets", skill.icon))) {
      problems.push(where + ' icon "' + skill.icon + '" is not in assets/');
    }
  });

  const cities = obj(content.cities);
  if (Object.keys(cities).length === 0) {
    problems.push("cities must list at least one city");
  }
  Object.keys(cities).forEach((key) => {
    const city = obj(cities[key]);
    text(city.name, "cities." + key + ".name");
    list(city.landmarks, "cities." + key + ".landmarks").forEach((l, i) => {
      const where = "cities." + key + ".landmarks[" + i + "]";
      text(obj(l).name, where + ".name");
      text(obj(l).image, where + ".image");
      if (l && l.image &&
          !fs.existsSync(path.join(ROOT, "assets", "landmarks", l.image))) {
        problems.push(where + ' image "' + l.image + '" is not in assets/landmarks/');
      }
    });
  });

  list(content.timeline, "timeline").forEach((entry, i) => {
    const where = "timeline[" + i + "]";
    const e = obj(entry);
    ["dates", "title", "description", "city"].forEach((k) =>
      text(e[k], where + "." + k),
    );
    if (e.organisation !== undefined) text(e.organisation, where + ".organisation");
    if (e.city && !cities[e.city]) {
      problems.push(where + '.city "' + e.city + '" is not one of the cities: ' +
        Object.keys(cities).join(", "));
    }
  });

  if (problems.length) stop(problems);
}

// ------------------------------------------------------------ render

function renderSkills(skills) {
  return skills
    .map((s) =>
      '            <li class="skill"><img src="assets/' + escapeHtml(s.icon) +
      '" alt="" class="skill-logo" />' + escapeHtml(s.name) + "</li>",
    )
    .join("\n");
}

// Each card's starting landmark is the next one in its city's list, so
// cards in the same city start on different landmarks. script.js turns
// the figure into a carousel; the <img> here is the no-JavaScript view.
function renderTimeline(timeline, cities) {
  const seen = {};
  return timeline
    .map((e) => {
      const city = cities[e.city];
      const n = seen[e.city] || 0;
      seen[e.city] = n + 1;
      const landmark = city.landmarks[n % city.landmarks.length];
      const heading = e.organisation ? e.title + " — " + e.organisation : e.title;
      return [
        '            <li class="timeline-item">',
        '              <span class="timeline-mark" aria-hidden="true"></span>',
        '              <div class="timeline-body">',
        '                <p class="timeline-date">' + escapeHtml(e.dates) + "</p>",
        "                <h3>" + escapeHtml(heading) + "</h3>",
        '                <p class="timeline-copy">' + escapeHtml(e.description) + "</p>",
        "              </div>",
        '              <figure class="timeline-place" data-city="' + escapeHtml(e.city) + '">',
        '                <img src="assets/landmarks/' + escapeHtml(landmark.image) +
          '" width="64" height="40" alt="" loading="lazy" decoding="async" />',
        "                <figcaption>" + escapeHtml(landmark.name + ", " + city.name) +
          "</figcaption>",
        "              </figure>",
        "            </li>",
      ].join("\n");
    })
    .join("\n\n");
}

function experienceSince(startedWorking) {
  const [year, month] = startedWorking.split("-").map(Number);
  return "Since " + MONTHS[month - 1] + " " + year;
}

// What script.js needs, as JSON inside the page. "<" is escaped so no
// value can close the <script> element early.
function siteData(content) {
  return JSON.stringify({
    profile: {
      firstName: content.profile.firstName,
      lastName: content.profile.lastName,
      location: content.profile.location,
    },
    contact: content.contact,
    experience: content.experience,
    cities: content.cities,
  }).replace(/</g, "\\u003c");
}

function fill(template, content) {
  const blocks = {
    skills: renderSkills(content.skills),
    timeline: renderTimeline(content.timeline, content.cities),
    siteData: siteData(content),
  };
  const values = Object.assign({}, content, {
    experienceSince: experienceSince(content.experience.startedWorking),
  });
  const missing = [];

  let html = template
    // The template's own header comment isn't part of the page, and
    // nothing may come before <!DOCTYPE html>.
    .replace(/^<!--template[\s\S]*?-->\s*/, "")
    .replace(/\{\{\{\s*(\w+)\s*\}\}\}/g, (_, key) => {
      if (!(key in blocks)) missing.push("{{{" + key + "}}}");
      return blocks[key] || "";
    })
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, keyPath) => {
      const value = keyPath.split(".").reduce((o, k) => (o == null ? o : o[k]), values);
      if (value == null || typeof value === "object") {
        missing.push("{{" + keyPath + "}}");
        return "";
      }
      return escapeHtml(value);
    });

  if (missing.length) {
    console.error("Build stopped. src/template.html uses slots with no content:\n");
    missing.forEach((m) => console.error("  - " + m));
    process.exit(1);
  }
  return html;
}

// ------------------------------------------------------------ build

const content = loadContent();
check(content);
const html = fill(fs.readFileSync(TEMPLATE, "utf8"), content);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "index.html"), html);
STATIC_FILES.forEach((f) =>
  fs.cpSync(path.join(ROOT, f), path.join(OUT, f), { recursive: true }),
);

console.log(
  "Built _site/ — " + content.skills.length + " skills, " +
  content.timeline.length + " timeline entries, " +
  Object.keys(content.cities).length + " cities.",
);
