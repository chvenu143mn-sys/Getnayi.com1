import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';

export interface Breadcrumb {
  name: string;
  item: string;
}

export interface SEOProps {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
  type?: string;
  structuredData?: Record<string, any>;
  breadcrumbs?: Breadcrumb[];
  keywords?: string[];
}

export function useDynamicMeta({ title, description, url, image, type }: Omit<SEOProps, 'structuredData' | 'breadcrumbs'>) {
  // This hook dynamically generates Open Graph and Twitter card metadata
  // based on the current page context, such as video title and creator profile image.
  return useMemo(() => {
    const defaultTitle = 'Aisles - The Future of Video Commerce';
    const defaultDescription = 'Discover and shop products through immersive video experiences. Connect with creators and brands in real-time.';
    const defaultImage = 'https://aisles.app/og-image.jpg';
    const defaultUrl = 'https://aisles.app';
    const defaultType = 'website';

    let finalUrl = url || defaultUrl;
    // Strip query strings to create canonical URL context for meta
    try {
      const urlObj = new URL(finalUrl);
      finalUrl = `${urlObj.origin}${urlObj.pathname}`;
    } catch {
      // ignore
    }

    const finalTitle = title || defaultTitle;
    const finalDescription = description || defaultDescription;
    const finalImage = image || defaultImage;
    const finalType = type || defaultType;

    return {
      openGraph: [
        { property: 'og:type', content: finalType },
        { property: 'og:url', content: finalUrl },
        { property: 'og:title', content: finalTitle },
        { property: 'og:description', content: finalDescription },
        { property: 'og:image', content: finalImage },
      ],
      twitter: [
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:url', content: finalUrl },
        { name: 'twitter:title', content: finalTitle },
        { name: 'twitter:description', content: finalDescription },
        { name: 'twitter:image', content: finalImage },
      ]
    };
  }, [title, description, url, image, type]);
}

export function SEO({
  title = 'Aisles - The Future of Video Commerce',
  description = 'Discover and shop products through immersive video experiences. Connect with creators and brands in real-time.',
  url = 'https://aisles.app',
  image = 'https://aisles.app/og-image.jpg',
  type = 'website',
  structuredData,
  breadcrumbs,
  keywords = ['video commerce', 'social shopping', 'creator economy', 'short form video'],
}: SEOProps) {
  // Enhanced schema for GEO and AEO
  const defaultSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Aisles',
    url: 'https://aisles.app/',
    description: 'The premier video commerce platform connecting creators, brands, and shoppers.',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://aisles.app/search?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  const schemas: any[] = [defaultSchema];
  if (structuredData) {
    schemas.push(structuredData);
  }

  if (breadcrumbs && breadcrumbs.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((bc, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: bc.name,
        item: bc.item,
      }))
    });
  }

  let canonicalUrl = url;
  try {
    const canonicalObj = new URL(url);
    canonicalUrl = `${canonicalObj.origin}${canonicalObj.pathname}`;
  } catch {
    // Ignore invalid URL
  }
  
  // Use the dynamic hook to generate metadata arrays for OG and Twitter
  const { openGraph, twitter } = useDynamicMeta({ title, description, url: canonicalUrl, image, type });

  return (
    <Helmet>
      {/* Primary Meta Tags for Basic SEO */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      {keywords.length > 0 && <meta name="keywords" content={keywords.join(', ')} />}
      
      {/* Canonical Link */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      {openGraph.map((meta, i) => (
        <meta key={`og-${i}`} property={meta.property} content={meta.content} />
      ))}

      {/* Twitter */}
      {twitter.map((meta, i) => (
        <meta key={`tw-${i}`} name={meta.name} content={meta.content} />
      ))}

      {/* Additional Tags for Generative/Answer Engines (GEO/AEO) */}
      <meta name="author" content="Aisles Platform" />
      <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />

      {/* JSON-LD Schema integration for semantic understanding by AI and Answer Engines */}
      <script type="application/ld+json">
        {JSON.stringify(schemas)}
      </script>
    </Helmet>
  );
}
