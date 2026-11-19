def region_of(stack):
    # innermost-first decision
    for tag, a in reversed(stack):
        cls = a.get('class', '') or ''
        if a.get('aria-label') == 'Breadcrumb' or 'crumbs' in cls.split(): return 'breadcrumb'
        if a.get('data-article-part') == 'toc' or 'toc' in cls.split(): return 'toc'
        if 'related' in cls.split(): return 'related'
        if 'author-bio' in cls.split() or a.get('data-article-part') == 'byline': return 'author'
        if 'hub-nav' in cls or a.get('data-hub-nav') is not None: return 'hubnav'
        if tag == 'aside': return 'sidebar'
        if 'pre-footer' in cls.split(): return 'cta'
        if tag == 'footer' and 'site-footer' in cls: return 'footer'
        if tag == 'header' and 'site-header' in cls: return 'nav'
        if tag == 'nav' and (a.get('aria-label') in ('Primary',) or a.get('data-mega-nav') is not None): return 'nav'
        if tag == 'script' or tag == 'template' or tag == 'noscript': return 'script'
    for tag, a in stack:
        if tag == 'main': return 'content'
    return 'other'
