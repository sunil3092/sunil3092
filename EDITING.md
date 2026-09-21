# Editing the site

All page content lives in `content.json`. Edit it, commit, push to `main`,
and GitHub builds and publishes the site. No HTML changes needed.

## Preview locally

```
node build.js
```

Then open `_site/index.html` in a browser. The build stops with a message
if anything in `content.json` is wrong (a missing comma, a city with no
landmarks, an icon file that doesn't exist), and GitHub does the same, so a
mistake never reaches the live site.

## Common changes

**Add a job or course** — add an entry to the top of `timeline`:

```json
{
  "dates": "01/2027 – Present",
  "title": "Staff Engineer",
  "organisation": "Company Name",
  "description": "What you did there.",
  "city": "dublin"
}
```

`organisation` is optional (courses put the school in `description`).
`city` must be one of the keys under `cities`; the card then cycles
through that city's landmarks automatically.

**Add a skill** — put its icon in `assets/`, then add
`{ "name": "Kotlin", "icon": "kotlin.svg" }` to `skills`.

**Change your photo, role, bio or links** — edit `profile` or `contact`.

**Experience counter** — counts from `experience.startedWorking`
(`"YYYY-MM"`), minus `yearsOffForStudy`.

## Adding a new city

Landmarks are 64×40 pixel-art SVGs in `assets/landmarks/`. Add the SVGs,
then list them under a new key in `cities`:

```json
"london": {
  "name": "London",
  "landmarks": [
    { "image": "tower-bridge.svg", "name": "Tower Bridge" }
  ]
}
```

## Where things live

| File | What it holds |
| --- | --- |
| `content.json` | All the words, links, skills, timeline and cities |
| `src/template.html` | Page structure and design; content slots in `{{ }}` |
| `style.css`, `script.js` | Styling and behaviour |
| `build.js` | Fills the template from `content.json` into `_site/` |
| `.github/workflows/deploy.yml` | Builds and publishes on push to `main` |
