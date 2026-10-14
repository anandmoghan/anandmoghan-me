'use client';

import { useState } from "react";
import { useAuth } from "@/common/firebase/AuthProvider";
import { useData } from "@/common/apps/family/hooks/useData";
import { Lightbox, TryonCard } from "@/common/apps/family/components/TryOn";
import { PageTitle, Segmented } from "@/common/apps/family/components/ui";
import { personLabel } from "@/common/apps/family/lib/format";
import { DISCLAIMER, TRYON_PEOPLE, defaultPerson, tryonRows } from "@/common/apps/family/lib/tryon";
import type { Person } from "@/common/apps/family/types";

export default function Tryons() {
  const { user } = useAuth();
  const { tryons, suggestions, mac } = useData();
  const [person, setPerson] = useState<Person>(() => defaultPerson(user?.email));
  const [big, setBig] = useState<string | null>(null);
  const rows = tryonRows({ tryons, requests: [], macLive: mac.live, match: (_ids, p) => p === person });
  return (
    <div className="space-y-5 px-4 pt-5 pb-6">
      <PageTitle title="My try-ons" sub="How you look in shop picks" />
      <Segmented label="Person" value={person} onChange={setPerson} options={TRYON_PEOPLE.map((p) => [p, personLabel(p)] as const)} />
      {rows.length === 0 ? (
        <p className="card !px-4 !py-8 text-center text-muted">No try-ons yet. Open a product and tap Try it on.</p>
      ) : (
        <ul className="space-y-3">{rows.map((r) => <TryonCard key={r.id} row={r} suggestions={suggestions} onOpen={setBig} />)}</ul>
      )}
      <p className="text-sm text-muted">{DISCLAIMER}</p>
      <Lightbox src={big} onClose={() => setBig(null)} />
    </div>
  );
}
