// Shared vocabulary for the site's pages: which files are teachings, which
// collection a teaching belongs to, and how its meta line reads.
//
// Categories come from the Obsidian vault as wikilinks ("[[Men's Group]]"), so
// every read of frontmatter.categories goes through categoriesOf().

const WIKILINK = /^\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/

const WORDS_PER_MINUTE = 220

/** Titles that belong to the "Feasts & Seasons" collection. */
const FEAST_TITLES =
  /Passover|Tabernacles|Trumpets|Atonement|Pentecost|First Fruits|Purim|Christmas/i

export function categoriesOf(file) {
  const raw = file.frontmatter?.categories
  if (!Array.isArray(raw)) return []
  return raw.map((c) => String(c).trim().replace(WIKILINK, "$1"))
}

export function titleOf(file) {
  return file.frontmatter?.title ?? "Untitled"
}

export const isTeaching = (file) => categoriesOf(file).includes("Teaching")

export const isNote = (file) => categoriesOf(file).includes("Study Note")

/**
 * The series label shown as a chip. "Teaching" and "Index" are deliberately not
 * labels — a teaching with no other category renders with no chip at all.
 */
export function seriesOf(file) {
  const [first] = categoriesOf(file).filter((c) => c !== "Teaching" && c !== "Index")
  if (!first) return ""
  return first === "books of the bible" ? "Books of the Bible" : first
}

export const COLLECTIONS = [
  { key: "everything", label: "Everything", test: () => true },
  {
    key: "books",
    label: "Books of the Bible",
    test: (file) => categoriesOf(file).includes("books of the bible"),
  },
  {
    key: "mens",
    label: "Men's Group",
    test: (file) => categoriesOf(file).includes("Men's Group"),
  },
  { key: "feasts", label: "Feasts & Seasons", test: (file) => FEAST_TITLES.test(titleOf(file)) },
]

export function teachingsOf(allFiles) {
  return allFiles.filter((f) => f.slug !== "index" && isTeaching(f))
}

export function notesOf(allFiles) {
  return allFiles.filter(isNote)
}

export function dateOf(file, cfg) {
  const dateType = file.defaultDateType ?? cfg.defaultDateType ?? "modified"
  return file.dates?.[dateType] ?? file.dates?.modified ?? file.dates?.created
}

export function formatDate(date, locale) {
  if (!date) return ""
  return date.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })
}

export function byNewest(cfg) {
  return (a, b) => {
    const aDate = dateOf(a, cfg)
    const bDate = dateOf(b, cfg)
    if (aDate && bDate) return bDate.getTime() - aDate.getTime()
    if (aDate) return -1
    if (bDate) return 1
    return titleOf(a).localeCompare(titleOf(b))
  }
}

export function readingMinutes(text) {
  if (!text) return 1
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}
