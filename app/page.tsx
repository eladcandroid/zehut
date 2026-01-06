'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { SearchBar } from '@/components/filters/search-bar';
import { ContentGrid, type ContentCardData } from '@/components/content';
import { useVisitor } from '@/lib/hooks/use-visitor';
import { Spinner } from '@phosphor-icons/react';
import type { Platform } from '@/lib/db/models/content';

interface ContentResponse {
  content: ContentCardData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');
  const [selectedSort, setSelectedSort] = useState('newest');
  const [search, setSearch] = useState('');
  const [content, setContent] = useState<ContentCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Initialize visitor tracking
  useVisitor();

  const fetchContent = useCallback(async (reset = false) => {
    try {
      setIsLoading(true);
      const currentPage = reset ? 1 : page;

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        sort: selectedSort,
      });

      if (selectedPlatform !== 'all') {
        params.set('platform', selectedPlatform);
      }

      if (search) {
        params.set('search', search);
      }

      const response = await fetch(`/api/content?${params}`);
      const data: ContentResponse = await response.json();

      if (reset) {
        setContent(data.content);
        setPage(1);
      } else {
        // Deduplicate by _id when appending
        setContent((prev) => {
          const existingIds = new Set(prev.map(item => item._id));
          const newItems = data.content.filter(item => !existingIds.has(item._id));
          return [...prev, ...newItems];
        });
      }

      setHasMore(data.pagination.hasMore);
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, selectedPlatform, selectedSort, search]);

  // Initial fetch and when filters change
  useEffect(() => {
    fetchContent(true);
  }, [selectedPlatform, selectedSort]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContent(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      setPage((prev) => prev + 1);
    }
  }, [isLoading, hasMore]);

  // Fetch more when page changes
  useEffect(() => {
    if (page > 1) {
      fetchContent(false);
    }
  }, [page]);

  // Infinite scroll with Intersection Observer
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loader = loaderRef.current;
    if (!loader) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(loader);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadMore]);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <Header onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          selectedPlatform={selectedPlatform}
          onPlatformChange={(platform) => {
            setSelectedPlatform(platform);
            setSidebarOpen(false);
          }}
          selectedSort={selectedSort}
          onSortChange={(sort) => {
            setSelectedSort(sort);
            setSidebarOpen(false);
          }}
        />

        <main className="flex-1 p-6 lg:p-8">
          {/* Search and Stats */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">
                  תוכן לשיתוף
                </h1>
                <p className="text-sm text-[var(--color-muted)] mt-1">
                  גלו ושתפו את התכנים של זהות ומשה פייגלין
                </p>
              </div>
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="חפש תוכן..."
                className="w-full sm:w-64"
              />
            </div>
          </div>

          {/* Content Grid */}
          <ContentGrid content={content} isLoading={isLoading && content.length === 0} />

          {/* Infinite Scroll Loader */}
          {hasMore && content.length > 0 && (
            <div ref={loaderRef} className="mt-8 flex justify-center py-4">
              {isLoading && (
                <Spinner className="w-6 h-6 text-[var(--color-primary)] animate-spin" />
              )}
            </div>
          )}

          {!hasMore && content.length > 0 && (
            <div className="mt-8 text-center text-sm text-[var(--color-muted)]">
              הגעת לסוף התוכן
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
