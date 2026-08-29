// The tinysystems.io generator: content/ + templates/ + static/ → dist/.
// Plain files out, nothing at runtime but nginx.
package main

import (
	"bytes"
	"fmt"
	"html/template"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
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
}

type Page struct {
	Meta
	Slug    string
	Path    string // URL path, e.g. /docs/install/
	Content template.HTML
}

type SiteData struct {
	Docs  []*Page
	Posts []*Page
}

var md = goldmark.New(
	goldmark.WithExtensions(extension.GFM),
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

	data := &SiteData{Docs: docs, Posts: posts}

	tpl, err := template.New("").Funcs(template.FuncMap{
		"nicedate": niceDate,
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
		{"docindex", "docs/index.html", nil},
		{"blogindex", "blog/index.html", nil},
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
	add := func(path string) {
		fmt.Fprintf(&b, "  <url><loc>%s%s</loc></url>\n", site, path)
	}
	add("/")
	add("/docs/")
	add("/blog/")
	for _, d := range data.Docs {
		add(d.Path)
	}
	for _, p := range data.Posts {
		add(p.Path)
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
