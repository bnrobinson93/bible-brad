import { Fragment, h } from "preact"
import { resolveRelative } from "@quartz-community/utils"
import {
  COLLECTIONS,
  byNewest,
  dateOf,
  formatDate,
  isNote,
  notesOf,
  readingMinutes,
  seriesOf,
  teachingsOf,
  titleOf,
} from "./data.js"

const RECENT_LIMIT = 12

const RAIL_NOTE = "Prepared for our men's leadership breakfast and young professionals group."

const GITHUB_URL = "https://github.com/bnrobinson93/bible-brad"

/** Pages that get an article header: everything except the home page and generated listings. */
function isArticle(slug) {
  return slug !== "index" && !slug.endsWith("/index") && !slug.startsWith("tags")
}

function collectionsOf(file) {
  return COLLECTIONS.filter((c) => c.test(file))
    .map((c) => c.key)
    .join(" ")
}

export const Wordmark = () => {
  const Wordmark = ({ fileData }) =>
    h("a", { class: "wordmark", href: resolveRelative(fileData.slug, "index") }, [
      "Bible",
      h("span", null, "Brad"),
    ])
  return Wordmark
}

export const MarginRail = () => {
  const MarginRail = ({ fileData, allFiles }) => {
    const teachings = teachingsOf(allFiles)
    const home = resolveRelative(fileData.slug, "index")

    const pill = (href, label, count) =>
      h("a", { href, "data-collection": href.split("#")[1] }, [
        label,
        count === undefined ? null : h("b", null, String(count)),
      ])

    return h("nav", { class: "rail" }, [
      h("p", { class: "rail-heading" }, "Collections"),
      h("div", { class: "pills" }, [
        pill(`${home}#recent`, "Recent"),
        ...COLLECTIONS.map((c) =>
          pill(`${home}#${c.key}`, c.label, teachings.filter(c.test).length),
        ),
      ]),
      h("p", { class: "rail-heading" }, "Reference"),
      h("div", { class: "pills" }, [
        h("a", { href: resolveRelative(fileData.slug, "notes") }, [
          "Notes",
          h("b", null, String(notesOf(allFiles).length)),
        ]),
        h("a", { href: GITHUB_URL }, "GitHub"),
      ]),
      h("p", { class: "rail-note" }, RAIL_NOTE),
    ])
  }
  return MarginRail
}

export const TeachingIndex = () => {
  const TeachingIndex = ({ fileData, allFiles, cfg }) => {
    if (fileData.slug !== "index") return null

    const locale = cfg.locale ?? "en-US"
    const teachings = teachingsOf(allFiles).sort(byNewest(cfg))
    const [newest] = teachings
    const labels = Object.fromEntries(COLLECTIONS.map((c) => [c.key, c.label]))

    // The generated description starts with the page's own h1, and sometimes with
    // the list marker of the first bullet under it.
    const blurbOf = (file) => {
      const title = titleOf(file)
      const description = file.description ?? ""
      const withoutTitle = description.startsWith(title)
        ? description.slice(title.length)
        : description
      return withoutTitle.replace(/^[\s-]+/, "")
    }

    const row = (file, index) => {
      const series = seriesOf(file)
      const meta = [series, formatDate(dateOf(file, cfg), locale)].filter(Boolean).join(" · ")
      return h(
        "a",
        {
          class: "index-item",
          href: resolveRelative(fileData.slug, file.slug),
          "data-collections": collectionsOf(file),
          "data-rank": String(index),
          // The list opens on "Recent"; the script reveals the rest per collection.
          hidden: index >= RECENT_LIMIT,
        },
        [
          h("span", { class: "index-head" }, [
            h("h3", null, titleOf(file)),
            h("span", { class: "index-meta" }, meta),
          ]),
          blurbOf(file) ? h("p", null, blurbOf(file)) : null,
        ],
      )
    }

    return h("section", { class: "teaching-index", "data-labels": JSON.stringify(labels) }, [
      newest
        ? h("a", { class: "latest", href: resolveRelative(fileData.slug, newest.slug) }, [
            h("span", { class: "latest-key" }, "Latest"),
            h("span", { class: "latest-title" }, titleOf(newest)),
            h("span", { class: "latest-date" }, `${formatDate(dateOf(newest, cfg), locale)} →`),
          ])
        : null,
      h("div", { class: "index-head-row" }, [
        h("h2", null, "Recent"),
        h("span", { class: "index-count" }, [
          `${Math.min(RECENT_LIMIT, teachings.length)} of ${teachings.length} · `,
          h("a", { href: "#everything" }, `All ${teachings.length} →`),
        ]),
      ]),
      h("div", { class: "index-list", "data-recent-limit": String(RECENT_LIMIT) }, [
        ...teachings.map(row),
        h("p", { class: "index-empty", hidden: true }, "Nothing in this collection yet."),
      ]),
    ])
  }

  TeachingIndex.afterDOMLoaded = `
document.addEventListener("nav", () => {
  const section = document.querySelector(".teaching-index")
  if (!section) return

  const list = section.querySelector(".index-list")
  const items = [...list.querySelectorAll(".index-item")]
  const empty = list.querySelector(".index-empty")
  const heading = section.querySelector(".index-head-row h2")
  const count = section.querySelector(".index-count")
  const labels = JSON.parse(section.dataset.labels)
  const recentLimit = Number(list.dataset.recentLimit)

  function apply() {
    const key = location.hash.replace(/^#/, "") || "recent"
    const recent = !(key in labels)
    let shown = 0
    for (const item of items) {
      const rank = Number(item.dataset.rank)
      const visible = recent
        ? rank < recentLimit
        : item.dataset.collections.split(" ").includes(key)
      item.hidden = !visible
      if (visible) shown++
    }
    empty.hidden = shown > 0
    heading.textContent = recent ? "Recent" : labels[key]
    count.textContent = shown + " of " + items.length
    if (recent) {
      count.append(" · ")
      const all = document.createElement("a")
      all.href = "#everything"
      all.textContent = "All " + items.length + " →"
      count.append(all)
    }
    for (const pill of document.querySelectorAll(".rail .pills a[data-collection]")) {
      pill.classList.toggle("on", pill.dataset.collection === (recent ? "recent" : key))
    }
  }

  apply()
  window.addEventListener("hashchange", apply)
  window.addCleanup(() => window.removeEventListener("hashchange", apply))
})
`
  return TeachingIndex
}

/**
 * The crumb above the title and the chip/date/reading-time row below it. Both
 * are emitted here as siblings of the title; CSS `order` puts the title between
 * them, since beforeBody is a single slot.
 */
export const ArticleHeader = () => {
  const ArticleHeader = ({ fileData, cfg }) => {
    if (!isArticle(fileData.slug)) return null

    const note = isNote(fileData)
    const root = note
      ? { href: resolveRelative(fileData.slug, "notes"), label: "Notes" }
      : { href: `${resolveRelative(fileData.slug, "index")}#everything`, label: "Everything" }
    const label = note ? "Note" : seriesOf(fileData)
    const date = formatDate(dateOf(fileData, cfg), cfg.locale ?? "en-US")

    return h(Fragment, null, [
      h("nav", { class: "crumb", "aria-label": "breadcrumbs" }, [
        h("a", { href: root.href }, root.label),
        label ? ` / ${label}` : null,
      ]),
      h("div", { class: "article-meta" }, [
        label ? h("span", { class: "chip" }, label) : null,
        date ? h("span", null, date) : null,
        date ? h("span", null, "·") : null,
        h("span", null, `${readingMinutes(fileData.text)} min read`),
      ]),
    ])
  }
  return ArticleHeader
}
