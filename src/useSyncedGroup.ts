import { useEffect, useState } from 'react';
import { useAuth } from './auth';
import { useEvenly } from './store';
import { ensureServerGroup, fetchServerMembers, type ServerMember } from './claims';
import type { Group } from './types';

/**
 * Links a local group to its server group (creating it on first use) and
 * loads the synced member list. Shared by the group home (invite code) and
 * the settle screen (claims).
 */
export function useSyncedGroup(group: Group | undefined) {
  const { ready: authReady, userId, profile } = useAuth();
  const { self, linkServerGroup } = useEvenly();
  const [serverGroupId, setServerGroupId] = useState<string | null>(null);
  const [members, setMembers] = useState<ServerMember[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!authReady || !userId || !profile || !group) return;
    const selfMember = self();
    if (!selfMember) return;
    let live = true;
    (async () => {
      setSyncing(true);
      setSyncError(null);
      try {
        const sid = await ensureServerGroup({
          localServerId: group.serverId,
          name: group.name,
          selfProfileId: userId,
          selfName: selfMember.name,
        });
        if (!live) return;
        setServerGroupId(sid);
        if (group.serverId !== sid) linkServerGroup(group.id, sid);
        const ms = await fetchServerMembers(sid);
        if (!live) return;
        setMembers(ms);
      } catch (e) {
        if (live) setSyncError(e instanceof Error ? e.message : 'Sync failed');
      } finally {
        if (live) setSyncing(false);
      }
    })();
    return () => {
      live = false;
    };
    // group identity is what matters here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, userId, group?.id]);

  const refresh = async () => {
    if (!serverGroupId) return;
    try {
      setMembers(await fetchServerMembers(serverGroupId));
    } catch {
      /* keep stale */
    }
  };

  return { serverGroupId, members, syncing, syncError, refresh };
}
