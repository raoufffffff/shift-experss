/**
 * Cloche — notifications RÉELLES, lues en base (plus de données de maquette) :
 *  · candidatures d'auto-entrepreneurs et de salariés (quelqu'un se propose) ;
 *  · messages non lus.
 * Lu / non lu vient de la base (`viewed_at`, `last_read_at`) — voir
 * `useRealNotifications`. Un clic ouvre le shift (ou la conversation) concerné.
 * L'onglet « Historique » garde le journal des décisions de la session.
 *
 * Les autres familles de la maquette (désistement, cascade, pointage, repos,
 * alerte) seront rebranchées quand les missions v2 liront la base.
 */
import { useState } from 'react';
import {
  Bell,
  UserPlus,
  MessageSquare,
  Check,
  X,
  CalendarDays,
  User,
  Wallet,
  Send,
} from 'lucide-react';
import { useV2Ui } from '@/stores/v2UiStore';
import type { JournalEntry, JournalKind } from '@/stores/v2UiStore';
import { useNavigate, useParams } from 'react-router-dom';
import { useRealNotifications } from '@/hooks/useRealNotifications';
import type { RealNotif } from '@/hooks/useRealNotifications';

type Kind = 'candidature' | 'message';

const kindOf = (n: RealNotif): Kind => (n.source === 'message' ? 'message' : 'candidature');

const KIND_STYLE: Record<Kind, { icon: typeof Bell; cls: string }> = {
  candidature: { icon: UserPlus, cls: 'bg-se-blue-wash text-se-blue-ink' },
  message: { icon: MessageSquare, cls: 'bg-se-freelance-wash text-se-freelance-ink' },
};

/** Historique : une icône par famille de décision. */
const JOURNAL_STYLE: Record<JournalKind, { icon: typeof Bell; cls: string }> = {
  mission: { icon: CalendarDays, cls: 'bg-se-surface-2 text-se-ink' },
  publication: { icon: Send, cls: 'bg-se-blue-wash text-se-blue-ink' },
  personne: { icon: User, cls: 'bg-se-freelance-wash text-se-freelance-ink' },
  paie: { icon: Wallet, cls: 'bg-se-success-wash text-se-success' },
};

/** « 14:32 » aujourd'hui, sinon « lun. 2 nov. 14:32 ». */
function journalTime(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? time
    : `${d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} ${time}`;
}

type BellTab = 'todo' | 'history';

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<BellTab>('todo');
  const { notifs: all, isLoading, markAsRead } = useRealNotifications();
  const journal = useV2Ui((s) => s.journal);
  const kindPrefs = useV2Ui((s) => s.notifPrefs.kinds);
  const requestOpenMission = useV2Ui((s) => s.requestOpenMission);
  const navigate = useNavigate();
  const { locale = 'fr' } = useParams<{ locale: string }>();

  // Les familles coupées dans Réglages › Notifications n'apparaissent pas.
  const notifs = all.filter((n) => (kindPrefs as Record<string, boolean>)[kindOf(n)] !== false);
  const unread = notifs.filter((n) => !n.isRead);

  // La fenêtre de mission s'ouvre par-dessus l'écran courant, où qu'on soit.
  const goToMission = (missionId: string) => {
    setOpen(false);
    requestOpenMission(missionId);
  };
  // Ouvre ce que la notification désigne : le shift (candidature) ou la conversation (message).
  const openNotif = (n: RealNotif) => {
    void markAsRead([n]);
    setOpen(false);
    if (n.conversationId) navigate(`/${locale}/messages?id=${n.conversationId}`);
    else if (n.shiftId) navigate(`/${locale}/shifts/${n.shiftId}`);
  };
  const openEntry = (e: JournalEntry) => {
    if (e.missionId) goToMission(e.missionId);
  };

  return (
    <>
      <button
        type="button"
        aria-label={unread.length ? `Notifications · ${unread.length} non lues` : 'Notifications'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="fixed top-4 right-4 z-40 w-10 h-10 rounded-full bg-se-surface border border-se-line grid place-items-center text-se-muted hover:text-se-ink shadow-se"
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {unread.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-se-danger text-white text-[10px] font-bold grid place-items-center">
            {unread.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="dialog"
            aria-label="Notifications"
            className="se-root fixed top-16 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)] bg-se-surface border border-se-line rounded-se shadow-se-md overflow-hidden"
          >
            <header className="flex items-center gap-2 px-4 py-3 border-b border-se-line">
              <p className="font-extrabold text-se-ink">Notifications</p>
              {tab === 'todo' && (
                <span className="text-xs text-se-muted">
                  {unread.length === 0 ? 'tout est lu' : `${unread.length} non lue${unread.length > 1 ? 's' : ''}`}
                </span>
              )}
              {tab === 'todo' && unread.length > 0 && (
                <button
                  type="button"
                  onClick={() => void markAsRead(unread)}
                  className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-se-blue-ink hover:text-se-blue"
                >
                  <Check className="w-3.5 h-3.5" aria-hidden="true" /> Tout marquer comme lu
                </button>
              )}
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setOpen(false)}
                className={`${tab === 'todo' && unread.length > 0 ? '' : 'ml-auto'} w-7 h-7 grid place-items-center rounded-se-sm hover:bg-se-surface-2 text-se-muted`}
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* À traiter (ce qui attend une action) · Historique (ce que vous avez décidé) */}
            <div role="tablist" aria-label="Notifications" className="flex gap-1 px-3 pt-2 border-b border-se-line">
              {(
                [
                  { key: 'todo', label: 'À traiter', count: unread.length },
                  { key: 'history', label: 'Historique', count: journal.length },
                ] as { key: BellTab; label: string; count: number }[]
              ).map((t) => {
                const on = tab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setTab(t.key)}
                    className={`px-3 py-2 -mb-px text-sm font-semibold border-b-2 transition-colors ${
                      on ? 'border-se-blue text-se-ink' : 'border-transparent text-se-muted hover:text-se-ink'
                    }`}
                  >
                    {t.label}
                    {t.count > 0 && <span className="ml-1.5 text-xs font-normal text-se-muted">{t.count}</span>}
                  </button>
                );
              })}
            </div>

            {tab === 'history' ? (
              journal.length === 0 ? (
                <p className="px-4 py-8 text-sm text-se-muted text-center">
                  Aucune décision pour l'instant. Vos actions (placements, annulations, candidatures, exports)
                  apparaîtront ici.
                </p>
              ) : (
                <ul className="max-h-[70vh] overflow-y-auto divide-y divide-se-line">
                  {journal.map((e) => {
                    const { icon: Icon, cls } = JOURNAL_STYLE[e.kind];
                    const Row = e.missionId ? 'button' : 'div';
                    return (
                      <li key={e.id}>
                        <Row
                          {...(e.missionId ? { type: 'button' as const, onClick: () => openEntry(e) } : {})}
                          className={`w-full flex items-start gap-3 px-4 py-3 text-left ${
                            e.missionId ? 'hover:bg-se-surface-2' : ''
                          }`}
                        >
                          <span className={`w-8 h-8 rounded-se-sm grid place-items-center shrink-0 ${cls}`}>
                            <Icon className="w-4 h-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-se-ink truncate">{e.label}</span>
                            {e.detail && <span className="block text-xs text-se-muted truncate">{e.detail}</span>}
                          </span>
                          <span className="text-[11px] text-se-muted whitespace-nowrap mt-0.5">
                            {journalTime(e.at)}
                          </span>
                        </Row>
                      </li>
                    );
                  })}
                </ul>
              )
            ) : isLoading && notifs.length === 0 ? (
              <p className="px-4 py-8 text-sm text-se-muted text-center">Chargement…</p>
            ) : notifs.length === 0 ? (
              <p className="px-4 py-8 text-sm text-se-muted text-center">Rien à signaler. Tout est en ordre.</p>
            ) : (
              <ul className="max-h-[70vh] overflow-y-auto divide-y divide-se-line">
                {notifs.map((n) => {
                  const { icon: Icon, cls } = KIND_STYLE[kindOf(n)];
                  const isRead = n.isRead;
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => openNotif(n)}
                        className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-se-surface-2 ${isRead ? 'opacity-60' : ''}`}
                      >
                        <span className={`w-8 h-8 rounded-se-sm grid place-items-center shrink-0 ${cls}`}>
                          <Icon className="w-4 h-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-se-ink truncate">{n.title}</span>
                          <span className="block text-xs text-se-muted truncate">{n.detail}</span>
                        </span>
                        {!isRead && (
                          <span className="mt-1.5 w-2 h-2 rounded-full bg-se-blue shrink-0" aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </>
  );
}
