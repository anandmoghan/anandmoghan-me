import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/common/apps/shell/Card';
import { ConsentChoice } from '@/common/visitors/ConsentChoice';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What anandmoghan.me stores about visitors and how to delete it.',
  alternates: {
    canonical: 'https://anandmoghan.me/privacy',
  },
};

const ALWAYS = [
  'An anonymous session: a random id with no name or email. It keeps your comments and settings working and needs no consent.',
  'Comments you post, with the nickname or name shown next to them.',
  'If you create an account, your email and profile name.',
];

const WITH_ANALYTICS = [
  'A page you visit and the page you came from, at most once an hour, with a per-tab session id.',
  'Your country, worked out from your IP address. The IP address itself is not stored.',
  'When you first and last visited, and how many pages you have viewed.',
  'Google Analytics page views, which set Google Analytics cookies.',
  'Your reading history: for each post or materials page you open, the title, when you last read it, how far you scrolled and the heading you were at.',
];

const NEVER = [
  'Your IP address.',
  'Anything at all from analytics while it is off, and Google Analytics is not loaded.',
];

function GlanceGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="settings-row">
      <div className="min-w-0">
        <h3 className="mb-2 font-semibold">{title}</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen">
      <section className="py-12">
        <div className="site-container">
          <h1 className="page-title mb-4">Privacy</h1>
          <div className="accent-rule mb-6"></div>
          <p className="mb-8 max-w-prose text-muted">
            This site keeps an anonymous session, and records more only if you turn analytics on.
          </p>

          <div className="space-y-10">
            <section aria-labelledby="glance">
              <h2 id="glance" className="settings-card-title">At a glance</h2>
              <Card className="settings-rows">
                <GlanceGroup title="Always stored" items={ALWAYS} />
                <GlanceGroup title="Stored only with analytics on" items={WITH_ANALYTICS} />
                <GlanceGroup title="Never stored" items={NEVER} />
              </Card>
            </section>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <h2 className="mb-2 text-lg font-bold">Where it lives</h2>
                <p className="text-sm">
                  Data is kept in Google Firebase (Firestore and Authentication) and is only read by
                  me, the site owner.
                  It stays until you delete it.
                </p>
              </Card>
              <Card>
                <h2 className="mb-2 text-lg font-bold">How to delete it</h2>
                <p className="text-sm">
                  Open <Link href="/settings">Settings</Link>, go to the Danger zone and choose{' '}
                  <strong>Delete my data</strong>.
                  That deletes your recorded visits, your comments, your reading history, your
                  profile and the session or account itself.
                </p>
              </Card>
            </div>

            <section aria-labelledby="analytics">
              <h2 id="analytics" className="settings-card-title">Your analytics choice</h2>
              <p className="mb-4 max-w-prose text-sm">
                The same choice lets the site show a Continue reading card with up to three
                unfinished reads, and suggest posts you have not read at the end of each post.
                Only you can read your reading history.
                With analytics off, Read next suggestions use only tags and recency.
              </p>
              <ConsentChoice />
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
