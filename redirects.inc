# 301s for old-platform URLs still in the index (inventory: Wayback CDX,
# 2026-08-29). Only real equivalents redirect; flow-era pages with no
# successor (modules, solutions, capabilities, pricing, sign-in/up, cloud)
# return the themed 404 on purpose — a blanket 301-to-home reads as a
# soft 404 to crawlers. docs.tinysystems.io 301s wholesale at the ingress.

location = /install  { return 301 /docs/install/; }
location = /download { return 301 /docs/install/; }
# the one old page about this exact product
location = /agents   { return 301 /; }
# old blog posts: the index carries the impressions, the posts are gone
location ~ ^/blog/(admission-webhook-registry-mirror|building-k8s-workflows-from-a-prompt|introducing-tiny-systems|registry-mirror-automation|self-hosted-ai-agents|workflow-engines-compared)/?$ { return 301 /blog/; }
