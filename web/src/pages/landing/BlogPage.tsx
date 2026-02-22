import { useTranslation } from '../../lib/i18n';
import { getLandingT } from '../../lib/i18n/landingLocales';
import { useState, useEffect } from 'react';

interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  created_at: string;
}

export function BlogPage() {
  const { locale } = useTranslation();
  const t = getLandingT(locale);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cms/posts')
      .then((r) => r.ok ? r.json() : { posts: [] })
      .then((data) => setPosts(data.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <h1 className="text-3xl sm:text-4xl font-bold text-white text-center mb-16">{t.blog_title}</h1>

      {loading ? (
        <p className="text-dark-400 text-center">{t.blog_loading}</p>
      ) : posts.length === 0 ? (
        <div className="text-center">
          <p className="text-dark-400 mb-8">{t.blog_no_posts}</p>
          {/* Placeholder cards for coming soon articles */}
          <div className="grid sm:grid-cols-2 gap-6 mt-8">
            <PlaceholderCard
              title="What is End-to-End Encryption?"
              desc="An accessible guide to E2EE and why it matters for your daily communications."
            />
            <PlaceholderCard
              title="Why We Use Tor"
              desc="Understanding onion routing and how it protects your identity online."
            />
            <PlaceholderCard
              title="Quantum-Resistant Cryptography"
              desc="How ML-KEM-1024 protects your messages against future quantum computers."
            />
            <PlaceholderCard
              title="Decentralized vs. Centralized Messaging"
              desc="Why peer-to-peer architecture is the future of private communication."
            />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <article key={post.id} className="card hover:border-primary-800/50 transition-colors">
              <h2 className="text-xl font-semibold text-white mb-2">{post.title}</h2>
              <p className="text-dark-400 text-sm mb-3">
                {post.author} &middot; {new Date(post.created_at).toLocaleDateString(locale)}
              </p>
              <p className="text-dark-300 leading-relaxed mb-4">{post.excerpt}</p>
              <a href={`/blog/${post.slug}`} className="text-primary-400 hover:text-primary-300 text-sm font-medium">
                {t.blog_read_more} →
              </a>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function PlaceholderCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="card opacity-60">
      <div className="flex items-center gap-2 mb-3">
        <span className="px-2 py-0.5 bg-dark-800 text-dark-400 text-xs rounded-full">Coming Soon</span>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-dark-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}
