import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "Bible Brad",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "plausible",
    },
    locale: "en-US",
    baseUrl: "biblebrad.com",
    ignorePatterns: ["private", "templates", ".obsidian", "*.sync-conflict-*"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Schibsted Grotesk",
        body: "Source Sans Pro",
        code: "IBM Plex Mono",
      },
      colors: {
        lightMode: {
          light: "#eff1f5", // page bg
          lightgray: "#e6e9ef", // borders
          gray: "#6c6f85", // links & heavy borders
          darkgray: "#5c5f77", // body text
          dark: "#4c4f69", // header text and icons
          secondary: "#7287fd", // link, current graph node
          tertiary: "#8839ef", // hover state, visted graph
          highlight: "rgba(32, 159, 181, 0.15)", // link bg, highlighted text, highlighted code
          textHighlight: "#df8e1d", // md highlighted bg
        },
        darkMode: {
          light: "#1e1e2e", // base
          lightgray: "#181825", // mantle
          gray: "#a6adc8", // subtext
          darkgray: "#bac2de", // subtext
          dark: "#cdd6f4", // text
          secondary: "#b4befe", // lavender
          tertiary: "#cba6f7", // mauve
          highlight: "rgba(116, 199, 236, 0.15)", // sapphire
          textHighlight: "#f9e2af", // yellow
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "catppuccin-latte",
          dark: "catppuccin-mocha",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      // Comment out CustomOgImages to speed up build time
      Plugin.CustomOgImages(),
    ],
  },
}

export default config
