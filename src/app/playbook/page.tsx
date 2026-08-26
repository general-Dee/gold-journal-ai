"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button, Card, Input, Textarea } from "@/components/ui/primitives";
import { useAuth } from "@/lib/auth-context";
import { listPlaybookPages, savePlaybookPage, deletePlaybookPage } from "@/lib/data";
import { cx } from "@/lib/utils";
import type { PlaybookPage } from "@/lib/types";

export default function PlaybookPageRoute() {
  const { user } = useAuth();
  const [pages, setPages] = useState<PlaybookPage[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveTimer, setSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const p = await listPlaybookPages(user.uid);
      setPages(p);
      if (p.length) setActiveId(p[0].id);
      setLoading(false);
    })();
  }, [user]);

  const active = pages.find((p) => p.id === activeId) ?? null;

  function createPage() {
    const page: PlaybookPage = {
      id: crypto.randomUUID(),
      title: "Untitled Setup",
      content: "",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setPages((p) => [page, ...p]);
    setActiveId(page.id);
  }

  function updateActive(patch: Partial<PlaybookPage>) {
    if (!active) return;
    const updated = { ...active, ...patch, updatedAt: Date.now() };
    setPages((p) => p.map((pg) => (pg.id === updated.id ? updated : pg)));
    if (saveTimer) clearTimeout(saveTimer);
    const timer = setTimeout(() => {
      if (user) savePlaybookPage(user.uid, updated);
    }, 600);
    setSaveTimer(timer);
  }

  async function handleDelete(id: string) {
    if (!user) return;
    if (!confirm("Delete this page?")) return;
    await deletePlaybookPage(user.uid, id);
    setPages((p) => p.filter((pg) => pg.id !== id));
    if (activeId === id) setActiveId(null);
  }

  return (
    <AppShell eyebrow="Strategy Library" title="Playbook">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
        <Card className="p-3">
          <Button variant="ghost" onClick={createPage} className="mb-2 w-full">+ New Page</Button>
          <div className="space-y-1">
            {pages.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveId(p.id)}
                className={cx(
                  "w-full truncate rounded-md px-3 py-2 text-left text-sm",
                  p.id === activeId ? "bg-gold/10 text-gold-bright" : "text-muted hover:bg-raised"
                )}
              >
                {p.title || "Untitled"}
              </button>
            ))}
            {pages.length === 0 && !loading && (
              <div className="px-3 py-6 text-center text-xs text-faint">No pages yet. Create your first setup page.</div>
            )}
          </div>
        </Card>

        <Card className="min-h-[60vh] p-6">
          {active ? (
            <div>
              <Input
                value={active.title}
                onChange={(e) => updateActive({ title: e.target.value })}
                className="mb-4 border-none bg-transparent px-0 font-display text-xl font-medium focus:ring-0"
                placeholder="Page title"
              />
              <Textarea
                value={active.content}
                onChange={(e) => updateActive({ content: e.target.value })}
                rows={22}
                placeholder="Write your setup rules, entry criteria, invalidation conditions, and examples here…"
                className="border-none bg-transparent px-0 leading-relaxed focus:ring-0"
              />
              <div className="mt-4 flex justify-end">
                <button onClick={() => handleDelete(active.id)} className="text-xs text-faint hover:text-loss">Delete page</button>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-faint">
              Select or create a page to start writing.
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
