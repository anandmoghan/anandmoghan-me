'use client';

import { useState } from "react";
import { useNavigate } from "@/common/apps/family/router";
import { useAuth } from "@/common/firebase/AuthProvider";
import { useToast } from "@/common/apps/family/hooks/useToast";
import { createBrief } from "@/common/apps/family/lib/writes";
import { personLabel } from "@/common/apps/family/lib/format";
import { BackLink } from "@/common/apps/family/pages/Product";
import { Segmented, primaryBtn } from "@/common/apps/family/components/ui";
import type { Person } from "@/common/apps/family/types";

const PEOPLE: Person[] = ["anand", "kavya", "nila"];

export default function NewBrief() {
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [person, setPerson] = useState<Person>("anand");
  const [title, setTitle] = useState("");
  const [needs, setNeeds] = useState("");
  const [budget, setBudget] = useState("");
  const [constraints, setConstraints] = useState("");
  const [deadline, setDeadline] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const { id, done } = createBrief(user?.email ?? "", {
      person,
      title: title.trim(),
      needs: needs.split("\n").map((n) => n.trim()).filter(Boolean),
      budget: Number(budget) > 0 ? Number(budget) : undefined,
      constraints: constraints.trim() || undefined,
      deadline: deadline || undefined,
    });
    done.catch(() => toast.show({ message: "Could not save the brief", error: true }));
    toast.show({ message: "Brief saved, the Mac will start on it when it is online" });
    nav(`/shop?brief=${id}`);
  }

  const field = "field mt-1.5 font-normal";
  return (
    <div className="mx-auto max-w-2xl px-4 pt-2 pb-6">
      <BackLink fallback="/shop" label="Back to shop" />
      <h1 className="mt-2 text-[1.65rem] font-extrabold">New brief</h1>
      <form onSubmit={submit} className="card mt-4 space-y-5 !p-4">
        <Segmented label="Who is it for" value={person} onChange={setPerson} options={PEOPLE.map((p) => [p, personLabel(p)] as const)} />
        <label className="block font-bold">What are you shopping for
          <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} className={field} placeholder="Winter layers for the office" />
        </label>
        <label className="block font-bold">Needs, one per line
          <textarea value={needs} onChange={(e) => setNeeds(e.target.value)} rows={4} className={field} />
        </label>
        <label className="block font-bold">Budget in rupees
          <input value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="numeric" className={field} />
        </label>
        <label className="block font-bold">Constraints
          <textarea value={constraints} onChange={(e) => setConstraints(e.target.value)} rows={2} className={field} />
        </label>
        <label className="block font-bold">Deadline
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={field} />
        </label>
        <button type="submit" disabled={!title.trim()} className={`${primaryBtn} w-full`}>Create brief</button>
      </form>
    </div>
  );
}
