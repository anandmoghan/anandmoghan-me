'use client';

import { useState } from "react";
import { useAuth } from "@/common/firebase/AuthProvider";
import { useData } from "@/common/apps/family/hooks/useData";
import { PageTitle, Segmented } from "@/common/apps/family/components/ui";
import { SectionedMarkdown } from "@/common/apps/family/components/Points";
import { personLabel, timeAgo } from "@/common/apps/family/lib/format";
import { TRYON_PEOPLE, defaultPerson } from "@/common/apps/family/lib/tryon";
import type { Person } from "@/common/apps/family/types";

export default function StyleGuide() {
  const { user } = useAuth();
  const { people } = useData();
  const [person, setPerson] = useState<Person>(() => defaultPerson(user?.email));
  const guide = people.find((p) => p.id === person)?.style_guide;
  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 pt-5 pb-6">
      <PageTitle title="Style guide" sub={guide?.updated_at ? `Updated ${timeAgo(guide.updated_at)}` : "Colours, fit rules and what to skip"} />
      <Segmented label="Person" value={person} onChange={setPerson} options={TRYON_PEOPLE.map((p) => [p, personLabel(p)] as const)} />
      {guide?.body ? (
        <SectionedMarkdown text={guide.body} max={3} cards />
      ) : (
        <p className="card !px-4 !py-8 text-center text-muted">No style guide yet</p>
      )}
    </div>
  );
}
