// The tinysystems.io generator: content/ + templates/ + static/ → dist/.
// Plain files out, nothing at runtime but nginx.
package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer/html"
	"gopkg.in/yaml.v3"
)

const site = "https://tinysystems.io"

type Meta struct {
	Title       string `yaml:"title"`
	Description string `yaml:"description"`
	Weight      int    `yaml:"weight"`
	Section     string `yaml:"section"`
	Date        string `yaml:"date"`
	Author      string `yaml:"author"`
	// SEOTitle replaces the <title> when set: the visible heading can stay
	// short while the search title carries the words people type.
	SEOTitle string `yaml:"seotitle"`
	// Updated is when a page's facts were last checked (compare pages).
	Updated string `yaml:"updated"`
}

type Page struct {
	Meta
	Slug    string
	Path    string // URL path, e.g. /docs/install/
	Content template.HTML
	Raw     string // the markdown body, for structured data built from it
}

type SiteData struct {
	Docs    []*Page
	Posts   []*Page
	Compare []*Page
}

var md = goldmark.New(
	goldmark.WithExtensions(extension.GFM),
	// Headings get ids so docs can link to a section (/docs/images/#...).
	goldmark.WithParserOptions(parser.WithAutoHeadingID()),
	goldmark.WithRendererOptions(html.WithUnsafe()),
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "build:", err)
		os.Exit(1)
	}
}

func run() error {
	dist := "dist"
	if err := os.RemoveAll(dist); err != nil {
		return err
	}

	docs, err := loadDir("content/docs", "/docs/")
	if err != nil {
		return err
	}
	sort.Slice(docs, func(i, j int) bool { return docs[i].Weight < docs[j].Weight })

	posts, err := loadDir("content/blog", "/blog/")
	if err != nil {
		return err
	}
	sort.Slice(posts, func(i, j int) bool { return posts[i].Date > posts[j].Date })

	compare, err := loadDir("content/compare", "/compare/")
	if err != nil {
		return err
	}
	sort.Slice(compare, func(i, j int) bool { return compare[i].Weight < compare[j].Weight })

	data := &SiteData{Docs: docs, Posts: posts, Compare: compare}

	// asset stamps a content-hash version onto a /static path so a changed
	// file always gets a fresh URL past the day-long edge cache.
	asset := func(p string) (string, error) {
		raw, err := os.ReadFile(strings.TrimPrefix(p, "/"))
		if err != nil {
			return "", fmt.Errorf("asset %s: %w", p, err)
		}
		return p + "?v=" + fmt.Sprintf("%x", sha256.Sum256(raw))[:8], nil
	}

	tpl, err := template.New("").Funcs(template.FuncMap{
		"nicedate":  niceDate,
		"asset":     asset,
		"ldhome":    ldHome,
		"ldarticle": ldArticle,
		"ldfaq":     ldFAQ,
		"dict_": func(kv ...any) (map[string]any, error) {
			if len(kv)%2 != 0 {
				return nil, fmt.Errorf("dict_ needs key/value pairs")
			}
			m := map[string]any{}
			for i := 0; i < len(kv); i += 2 {
				k, ok := kv[i].(string)
				if !ok {
					return nil, fmt.Errorf("dict_ key %v is not a string", kv[i])
				}
				m[k] = kv[i+1]
			}
			return m, nil
		},
	}).ParseGlob("templates/*.html")
	if err != nil {
		return err
	}

	type job struct {
		tplName string
		outPath string
		page    *Page
	}
	jobs := []job{
		{"home", "index.html", nil},
		{"notfound", "404.html", nil},
		{"privacy", "privacy/index.html", nil},
		{"docindex", "docs/index.html", nil},
		{"blogindex", "blog/index.html", nil},
		{"compareindex", "compare/index.html", nil},
	}
	for _, c := range compare {
		jobs = append(jobs, job{"compare", filepath.Join("compare", c.Slug, "index.html"), c})
	}
	for _, d := range docs {
		jobs = append(jobs, job{"doc", filepath.Join("docs", d.Slug, "index.html"), d})
	}
	for _, p := range posts {
		jobs = append(jobs, job{"post", filepath.Join("blog", p.Slug, "index.html"), p})
	}

	for _, j := range jobs {
		out := filepath.Join(dist, j.outPath)
		if err := os.MkdirAll(filepath.Dir(out), 0o755); err != nil {
			return err
		}
		var buf bytes.Buffer
		err := tpl.ExecuteTemplate(&buf, j.tplName, map[string]any{
			"Site": data,
			"Page": j.page,
		})
		if err != nil {
			return fmt.Errorf("%s: %w", j.outPath, err)
		}
		if err := os.WriteFile(out, buf.Bytes(), 0o644); err != nil {
			return err
		}
	}

	if err := copyDir("static", filepath.Join(dist, "static")); err != nil {
		return err
	}
	// root-level singles served from /
	for _, f := range []string{"robots.txt", "favicon.svg"} {
		if err := copyFile(filepath.Join("static", f), filepath.Join(dist, f)); err != nil {
			return err
		}
	}

	if err := writeSitemap(dist, data); err != nil {
		return err
	}
	if err := writeLLMs(dist, data); err != nil {
		return err
	}

	fmt.Printf("built %d docs, %d posts → %s/\n", len(docs), len(posts), dist)
	return nil
}

func loadDir(dir, urlPrefix string) ([]*Page, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var pages []*Page
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".md") {
			continue
		}
		raw, err := os.ReadFile(filepath.Join(dir, e.Name()))
		if err != nil {
			return nil, err
		}
		p, err := parsePage(raw)
		if err != nil {
			return nil, fmt.Errorf("%s/%s: %w", dir, e.Name(), err)
		}
		p.Slug = strings.TrimSuffix(e.Name(), ".md")
		p.Path = urlPrefix + p.Slug + "/"
		pages = append(pages, p)
	}
	return pages, nil
}

func parsePage(raw []byte) (*Page, error) {
	rest, ok := bytes.CutPrefix(raw, []byte("---\n"))
	if !ok {
		return nil, fmt.Errorf("missing front matter")
	}
	fm, body, ok := bytes.Cut(rest, []byte("\n---\n"))
	if !ok {
		return nil, fmt.Errorf("unterminated front matter")
	}
	var p Page
	if err := yaml.Unmarshal(fm, &p.Meta); err != nil {
		return nil, err
	}
	if p.Title == "" {
		return nil, fmt.Errorf("front matter needs a title")
	}
	var buf bytes.Buffer
	if err := md.Convert(body, &buf); err != nil {
		return nil, err
	}
	p.Content = template.HTML(buf.String())
	p.Raw = string(body)
	return &p, nil
}

func niceDate(d string) string {
	t, err := time.Parse("2006-01-02", d)
	if err != nil {
		return d
	}
	return t.Format("Jan 2, 2006")
}

func writeSitemap(dist string, data *SiteData) error {
	var b strings.Builder
	b.WriteString(`<?xml version="1.0" encoding="UTF-8"?>` + "\n")
	b.WriteString(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` + "\n")
	add := func(path, lastmod string) {
		if lastmod != "" {
			fmt.Fprintf(&b, "  <url><loc>%s%s</loc><lastmod>%s</lastmod></url>\n", site, path, lastmod)
			return
		}
		fmt.Fprintf(&b, "  <url><loc>%s%s</loc></url>\n", site, path)
	}
	add("/", "")
	add("/docs/", "")
	add("/blog/", "")
	add("/compare/", "")
	add("/privacy/", "")
	for _, d := range data.Docs {
		add(d.Path, "")
	}
	for _, p := range data.Posts {
		add(p.Path, p.Date)
	}
	for _, c := range data.Compare {
		add(c.Path, c.Updated)
	}
	b.WriteString("</urlset>\n")
	return os.WriteFile(filepath.Join(dist, "sitemap.xml"), []byte(b.String()), 0o644)
}

func copyDir(src, dst string) error {
	return filepath.WalkDir(src, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(src, path)
		target := filepath.Join(dst, rel)
		if d.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		return copyFile(path, target)
	})
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, in)
	return err
}

// ---- structured data (schema.org JSON-LD) ----

func jsonLD(v any) (template.JS, error) {
	b, err := json.Marshal(v) // escapes <, > and & so it can't close the script tag
	if err != nil {
		return "", err
	}
	return template.JS(b), nil
}

var org = map[string]any{"@type": "Organization", "name": "tiny systems", "url": site}

func ldHome() (template.JS, error) {
	return jsonLD(map[string]any{
		"@context":            "https://schema.org",
		"@type":               "SoftwareApplication",
		"name":                "tiny",
		"description":         "Open-source runtime that runs the real Claude Code and Codex CLIs as pods on your own Kubernetes cluster, with no git or cloud credentials in the pod.",
		"url":                 site + "/",
		"applicationCategory": "DeveloperApplication",
		"operatingSystem":     "macOS, Linux; Kubernetes",
		"license":             "https://opensource.org/licenses/MIT",
		"codeRepository":      "https://github.com/tiny-systems/tiny",
		"sameAs":              []string{"https://github.com/tiny-systems/tiny"},
		"offers":              map[string]any{"@type": "Offer", "price": "0", "priceCurrency": "USD"},
		"publisher":           org,
	})
}

// ldArticle describes a blog post or a compare page.
func ldArticle(p *Page) (template.JS, error) {
	m := map[string]any{
		"@context":         "https://schema.org",
		"@type":            "BlogPosting",
		"headline":         p.Title,
		"description":      p.Description,
		"url":              site + p.Path,
		"mainEntityOfPage": site + p.Path,
		"image":            site + "/static/og.jpg",
		"author":           org,
		"publisher":        org,
	}
	if p.Date != "" {
		m["datePublished"] = p.Date
		m["dateModified"] = p.Date
	}
	if p.Updated != "" {
		m["@type"] = "TechArticle"
		m["dateModified"] = p.Updated
		if p.Date == "" {
			m["datePublished"] = p.Updated
		}
	}
	return jsonLD(m)
}

var (
	mdLink   = regexp.MustCompile(`\[([^\]]+)\]\([^)]+\)`)
	mdMarkup = regexp.MustCompile("[*`_]")
	spaces   = regexp.MustCompile(`\s+`)
)

func plain(md string) string {
	s := mdLink.ReplaceAllString(md, "$1")
	s = mdMarkup.ReplaceAllString(s, "")
	return strings.TrimSpace(spaces.ReplaceAllString(s, " "))
}

// ldFAQ turns a page made of "## Question" sections into FAQPage data.
func ldFAQ(p *Page) (template.JS, error) {
	var items []map[string]any
	for _, sec := range strings.Split("\n"+p.Raw, "\n## ")[1:] {
		q, a, _ := strings.Cut(sec, "\n")
		q, a = strings.TrimSpace(q), plain(a)
		if q == "" || a == "" {
			continue
		}
		items = append(items, map[string]any{
			"@type":          "Question",
			"name":           q,
			"acceptedAnswer": map[string]any{"@type": "Answer", "text": a},
		})
	}
	return jsonLD(map[string]any{"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": items})
}

// writeLLMs publishes /llms.txt: what the project is, and where to read more,
// in the format AI tools look for.
func writeLLMs(dist string, data *SiteData) error {
	var b strings.Builder
	b.WriteString("# tiny\n\n")
	b.WriteString("> Open-source runtime that runs the real Claude Code and Codex CLIs as pods on your own Kubernetes cluster. ")
	b.WriteString("The pod holds no git or cloud credentials (finished work leaves as a git bundle that a separate job pushes), nothing in it listens, ")
	b.WriteString("egress is default-deny with an optional hostname allow-list, and risky actions wait for a human who answers with their own credentials. MIT licensed.\n\n")
	b.WriteString("Source: https://github.com/tiny-systems/tiny\n\n## Docs\n\n")
	for _, d := range data.Docs {
		fmt.Fprintf(&b, "- [%s](%s%s): %s\n", d.Title, site, d.Path, d.Description)
	}
	b.WriteString("\n## Comparisons\n\n")
	for _, c := range data.Compare {
		fmt.Fprintf(&b, "- [%s](%s%s): %s\n", c.Title, site, c.Path, c.Description)
	}
	b.WriteString("\n## Blog\n\n")
	for _, p := range data.Posts {
		fmt.Fprintf(&b, "- [%s](%s%s): %s\n", p.Title, site, p.Path, p.Description)
	}
	return os.WriteFile(filepath.Join(dist, "llms.txt"), []byte(b.String()), 0o644)
}
