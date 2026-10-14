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
      <section className="py-12 px-6 sm:px-8 lg:px-12">
        <div className="max-w-3xl mx-auto">
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
              If you decline, none of that is recorded and Google Analytics is not loaded.
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
              Open your <Link href="/apps/account">account page</Link> and choose
              {' '}<strong>Delete my data</strong>.
              That deletes your recorded visits, your comments, your profile and the session or
              account itself.
            </p>

            <h2>Your analytics choice</h2>
          </div>
          <div className="mt-4">
            <ConsentChoice />
          </div>
        </div>
      </section>
    </main>
  );
}
