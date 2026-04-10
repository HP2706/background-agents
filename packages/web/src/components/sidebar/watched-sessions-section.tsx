"use client";

import Link from "next/link";
import useSWR from "swr";
import { CollapsibleSection } from "./collapsible-section";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/time";

interface WatchedSession {
  sessionId: string;
  title: string | null;
  addedAt: number;
}

interface WatchedSessionsSectionProps {
  sessionId: string;
}

export function WatchedSessionsSection({ sessionId }: WatchedSessionsSectionProps) {
  const { data } = useSWR<{ sessions: WatchedSession[] }>(
    `/api/sessions/${sessionId}/watched-sessions`,
    {
      refreshInterval: 30_000,
    }
  );

  const sessions = data?.sessions;
  if (!sessions?.length) return null;

  return (
    <CollapsibleSection title="Watched Sessions" defaultOpen={true}>
      <div className="space-y-2">
        {sessions.map((watched) => (
          <Link
            key={watched.sessionId}
            href={`/session/${watched.sessionId}`}
            className="block p-2 hover:bg-muted transition-colors rounded"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatRelativeTime(watched.addedAt)}
                </span>
                <span className="text-sm truncate">{watched.title || watched.sessionId}</span>
              </div>
              <Badge variant="info" className="shrink-0">
                watching
              </Badge>
            </div>
          </Link>
        ))}
      </div>
    </CollapsibleSection>
  );
}
