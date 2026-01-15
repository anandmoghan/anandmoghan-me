import { Navigation } from "@/common/components/Navigation";

export default function StaticPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="static-pages min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <Navigation />
      {children}
      <footer className="py-16 px-6 sm:px-8 lg:px-12" style={{ 
        backgroundColor: 'var(--foreground)',
        color: 'white'
      }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h3 className="text-xl font-bold mb-2">Anand Mohan</h3>
              <p className="text-sm opacity-80">AI Scientist at Amazon</p>
            </div>
            <div className="flex gap-6">
              <a href="/posts" className="text-sm hover:opacity-70 transition-opacity">Posts</a>
              <a href="/about" className="text-sm hover:opacity-70 transition-opacity">About</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/20 text-center">
            <p className="text-sm opacity-70">
              © {new Date().getFullYear()} Anand Mohan. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
