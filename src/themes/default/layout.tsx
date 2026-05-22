import Header from './components/Header'
import Footer from './components/Footer'
import MobileBottomNav from './components/MobileBottomNav'
import type { ThemeLayoutProps } from '@/types/theme'
import type { SiteSettings } from '@/types'

// Dark mode override block — must come AFTER any :root{} user vars to win in the cascade
const DARK_VARS = `@media(prefers-color-scheme:dark){:root{` +
  `--color-bg:#0f172a;--color-bg-secondary:#1e293b;--color-bg-tertiary:#334155;` +
  `--color-text:#f1f5f9;--color-text-secondary:#94a3b8;--color-text-muted:#64748b;` +
  `--color-border:#334155;` +
  `--shadow-sm:0 1px 3px rgba(0,0,0,.3);--shadow-md:0 4px 16px rgba(0,0,0,.3);--shadow-lg:0 16px 40px rgba(0,0,0,.4)` +
  `}}`

function buildCssVars(settings: SiteSettings): string {
  const vars = (settings['theme.variables'] as Record<string, string>) || {}
  const custom = (settings['theme.customCss'] as string) || ''
  const declarations = Object.entries(vars)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}:${v}`)
    .join(';')
  const baseBlock = declarations ? `:root{${declarations}}` : ''
  // DARK_VARS appended after baseBlock so the @media query overrides any light-mode
  // color values the user may have stored in theme.variables
  return `${baseBlock}${DARK_VARS}${custom}`
}

const proseStyles = `
  .prose { max-width: 100%; }
  .prose h2,.prose h3,.prose h4 {
    font-family: var(--font-heading);
    font-weight: 700; line-height: 1.3;
    color: var(--color-text); letter-spacing: -0.02em;
  }
  .prose h2 { font-size: 1.5rem; margin: 2.25em 0 0.875em; border-bottom: 1px solid var(--color-border); padding-bottom: 0.5em; }
  .prose h3 { font-size: 1.2rem; margin: 2em 0 0.75em; }
  .prose h4 { font-size: 1.05rem; margin: 1.75em 0 0.625em; }
  .prose p { margin: 1.35em 0; }
  .prose a { color: var(--color-primary); text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 1px; }
  .prose a:hover { text-decoration-thickness: 2px; }
  .prose strong { font-weight: 700; color: var(--color-text); }
  .prose em { font-style: italic; }
  .prose blockquote {
    border-left: 3px solid var(--color-primary);
    padding: 0.75em 1.25em; margin: 1.75em 0;
    color: var(--color-text-secondary);
    background: color-mix(in srgb, var(--color-primary) 6%, var(--color-bg));
    border-radius: 0 var(--radius) var(--radius) 0; font-style: italic;
  }
  .prose pre {
    background: #0f172a; color: #e2e8f0;
    padding: 1.375em 1.5em; border-radius: var(--radius-lg);
    overflow-x: auto; font-size: 0.875em; margin: 1.75em 0;
    line-height: 1.7; border: 1px solid rgba(255,255,255,0.06);
  }
  .prose code {
    background: color-mix(in srgb, var(--color-primary) 10%, var(--color-bg-secondary));
    color: var(--color-primary); padding: 0.15em 0.45em;
    border-radius: 5px; font-size: 0.875em;
    border: 1px solid color-mix(in srgb, var(--color-primary) 15%, var(--color-border));
  }
  .prose pre code { background: none; color: inherit; padding: 0; border: none; font-size: 1em; }
  .prose ul,.prose ol { padding-left: 1.75em; margin: 1.35em 0; }
  .prose li { margin: 0.5em 0; line-height: 1.75; }
  .prose ul li { list-style-type: disc; }
  .prose ol li { list-style-type: decimal; }
  .prose hr { border: none; border-top: 1px solid var(--color-border); margin: 2.5em 0; }
  .prose img { max-width: 100%; border-radius: var(--radius-lg); margin: 2em auto; box-shadow: var(--shadow-md); }
  .prose table { width: 100%; border-collapse: collapse; margin: 1.75em 0; font-size: 0.9em; }
  .prose th,.prose td { border: 1px solid var(--color-border); padding: 0.625em 0.875em; text-align: left; }
  .prose th { background: var(--color-bg-secondary); font-weight: 600; color: var(--color-text); }
  .prose tr:nth-child(even) td { background: var(--color-bg-secondary); }
  .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
  .hide-scrollbar::-webkit-scrollbar { display: none; }
`

export default function DefaultLayout({ children, settings }: ThemeLayoutProps) {
  const inlineStyle = buildCssVars(settings)
  const headerHtml = (settings['theme.headerHtml'] as string) || ''
  const footerHtml = (settings['theme.footerHtml'] as string) || ''
  const customJs = (settings['theme.customJs'] as string) || ''

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: proseStyles + inlineStyle }} />
      <Header settings={settings} />
      {headerHtml && <div dangerouslySetInnerHTML={{ __html: headerHtml }} />}
      {children}
      {footerHtml && <div dangerouslySetInnerHTML={{ __html: footerHtml }} />}
      <Footer settings={settings} />
      <MobileBottomNav />
      {customJs && <script dangerouslySetInnerHTML={{ __html: customJs }} />}
    </>
  )
}
