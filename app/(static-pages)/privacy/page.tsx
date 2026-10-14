import type { Metadata } from 'next';
import Link from 'next/link';
import { ConsentChoice } from '@/common/visitors/ConsentChoice';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What anandmoghan.me stores about visitors and how to delete it.',
  alternates: {
    canonical: 'https://anandmoghan.me/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen">
      <section className="py-12">
        <div className="site-container">
          <h1 className="page-title mb-4">Privacy</h1>
          <div className="accent-rule mb-8"></div>

          <div className="prose">
            <h2>What is stored</h2>
            <p>
              Every visit gets an anonymous session: a random id with no name or email attached.
              It keeps your comments and settings working and needs no consent.
            </p>
            <p>If you accept analytics in the banner, the site also records:</p>
            <ul>
              <li>the pages you visit, the page you came from and a per-tab session id;</li>
              <li>your country, worked out from your IP address (the IP address itself is not stored);</li>
              <li>when you first and last visited, and how many pages you have viewed;</li>
              <li>Google Analytics page views, which set Google Analytics cookies.</li>
            </ul>
            <p>
              The same choice lets the site remember what you read and roughly where you are
              visiting from (your country).
              For each post or materials page you open, it stores the title, when you last read
              it, how far you scrolled and the heading you were at.
              That is used to show a Continue reading card with up to three unfinished reads,
              and to suggest posts you have not read at the end of each post.
              Only you can read this history.
            </p>
            <p>
              If you decline, none of that is recorded and Google Analytics is not loaded.
              Read next suggestions then use only tags and recency.
              Comments you post are stored with the nickname or name shown next to them.
              If you create an account, your email and profile name are stored with it.
            </p>

            <h2>Where it lives</h2>
            <p>
              Data is kept in Google Firebase (Firestore and Authentication) and is only read by
              me, the site owner.
              It stays until you delete it.
            </p>

            <h2>How to delete it</h2>
            <p>
              Open your <Link href="/account">account page</Link> and choose
              {' '}<strong>Delete my data</strong>.
              That deletes your recorded visits, your comments, your reading history, your profile and the session or
              account itself.
            </p>

            <h2 id="analytics">Your analytics choice</h2>
          </div>
          <div className="mt-4">
            <ConsentChoice />
          </div>
        </div>
      </section>
    </main>
  );
}
