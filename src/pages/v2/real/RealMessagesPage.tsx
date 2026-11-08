/**
 * Messages — conversations réelles (Supabase) avec les salariés et les
 * auto-entrepreneurs. À gauche la liste (recherche + filtre), à droite le fil.
 * Sur téléphone : la liste, puis le fil avec un retour.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, Loader2, MessageSquare, Plus, Search, Send, Trash2, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { useChat } from '@/hooks/useChat';
import { useAuthStore } from '@/stores/authStore';
import { NewMessageDialog } from '@/components/chat/NewMessageDialog';
import type { Conversation, Message } from '@/types/chat';
import { Face } from './MissionCard';
import { SeModal, seGhost, sePrimary } from './dialogs/SeModal';

type Filter = 'all' | 'employee' | 'freelancer';

function other(c: Conversation, myId?: string) {
  const p = c.participants.find((x) => x.user_id !== myId) ?? c.participants[0];
  const u = p?.user;
  const f = u?.role_freelancer?.[0];
  const name =
    (f?.full_name || [f?.first_name, f?.last_name].filter(Boolean).join(' ')) ||
    [u?.first_name, u?.last_name].filter(Boolean).join(' ') ||
    u?.email || 'Utilisateur';
  const photo = u?.profile_photo_url || f?.profile_photo_url || u?.avatar_url || null;
  return { id: p?.user_id ?? '', name, photo };
}

const fmtTime = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const same = d.toDateString() === new Date().toDateString();
  return same
    ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

export function RealMessagesPage() {
  const me = useAuthStore((s) => s.user);
  const [params, setParams] = useSearchParams();
  const activeId = params.get('id') || undefined;
  const { conversations, messages, activeConversation, sendMessage, createConversation, deleteConversation, blockUser, canMessage, isLoading, isError } = useChat(activeId);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [newOpen, setNewOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | 'delete' | 'block'>(null);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const select = (id?: string) => setParams(id ? { id } : {}, { replace: false });

  // Démarrage depuis un lien : ?userId=…&type=…
  useEffect(() => {
    const userId = params.get('userId');
    const type = params.get('type') as 'employee' | 'freelancer' | null;
    if (!userId || !type || !conversations) return;
    const existing = conversations.find((c) => c.type === type && c.participants.some((p) => p.user_id === userId));
    if (existing) {
      setParams({ id: existing.id }, { replace: true });
    } else if (!createConversation.isPending) {
      createConversation.mutateAsync({ participantId: userId, type }).then((c: any) => setParams({ id: c.id }, { replace: true })).catch(() => toast.error('Impossible de créer la conversation'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, conversations]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages?.length, activeId]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (conversations ?? [])
      .filter((c) => filter === 'all' || c.type === filter)
      .filter((c) => !q || other(c, me?.id).name.toLowerCase().includes(q));
  }, [conversations, filter, query, me?.id]);

  const selected = activeConversation ?? undefined;
  const who = selected ? other(selected, me?.id) : null;

  const send = async () => {
    const content = text.trim();
    if (!content || !activeId) return;
    setText('');
    try { await sendMessage.mutateAsync({ content, conversationId: activeId }); }
    catch { setText(content); toast.error("Le message n'a pas pu être envoyé"); }
  };

  const doConfirm = async () => {
    if (!selected || !who) return;
    try {
      if (confirm === 'block') await blockUser.mutateAsync(who.id);
      await deleteConversation.mutateAsync(selected.id);
      toast.success(confirm === 'block' ? 'Utilisateur bloqué' : 'Conversation supprimée');
      setConfirm(null); select(undefined);
    } catch { toast.error('Action impossible pour le moment'); }
  };

  const tabs: { k: Filter; label: string }[] = [
    { k: 'all', label: 'Tous' }, { k: 'employee', label: 'Salariés' }, { k: 'freelancer', label: 'Auto-entrepreneurs' },
  ];
  const unread = (conversations ?? []).reduce((s, c) => s + (c.unread_count ?? 0), 0);

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      <header className="mb-5 flex items-end gap-3">
        <div>
          <p className="se-eyebrow mb-1">Équipe &amp; auto-entrepreneurs</p>
          <h1 className="text-3xl font-extrabold text-se-ink">Messages</h1>
          <p className="text-se-muted mt-1 text-sm">
            {(conversations ?? []).length} conversation{(conversations ?? []).length > 1 ? 's' : ''}{unread > 0 && ` · ${unread} non lu${unread > 1 ? 's' : ''}`}
          </p>
        </div>
        <button type="button" onClick={() => setNewOpen(true)} className={`${sePrimary} ml-auto`}><Plus className="w-4 h-4" aria-hidden="true" /> Nouveau message</button>
      </header>

      {isError ? (
        <p className="text-sm text-se-danger bg-se-danger-wash rounded-se p-6 text-center">Impossible de charger les conversations. Réessayez dans un instant.</p>
      ) : (
        <div className="grid md:grid-cols-[360px_1fr] gap-4 items-start">
          {/* Liste */}
          <div className={activeId ? 'hidden md:block' : ''}>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-se-muted" aria-hidden="true" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Chercher une personne…"
                className="w-full h-10 pl-9 pr-3 rounded-se-sm border border-se-line bg-se-surface text-sm text-se-ink focus:outline-none focus:border-se-blue" />
            </div>
            <div className="flex gap-1.5 mb-3 overflow-x-auto">
              {tabs.map((t) => (
                <button key={t.k} type="button" onClick={() => setFilter(t.k)}
                  className={`h-8 px-3 rounded-full text-xs font-semibold whitespace-nowrap border ${filter === t.k ? 'bg-se-ink text-white border-se-ink' : 'bg-se-surface text-se-ink border-se-line hover:bg-se-surface-2'}`}>{t.label}</button>
              ))}
            </div>
            {isLoading && !conversations ? (
              <div className="py-10 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-se-muted" /></div>
            ) : list.length === 0 ? (
              <p className="text-sm text-se-muted bg-se-surface border border-se-line rounded-se p-6 text-center">Aucune conversation. Utilisez « Nouveau message » pour écrire à quelqu'un.</p>
            ) : (
              <ul className="bg-se-surface border border-se-line rounded-se shadow-se divide-y divide-se-line overflow-hidden">
                {list.map((c) => {
                  const o = other(c, me?.id);
                  const kind = c.type === 'freelancer' ? 'freelance' : 'salarie';
                  const n = c.unread_count ?? 0;
                  return (
                    <li key={c.id}>
                      <button type="button" onClick={() => select(c.id)} className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-se-surface-2 ${c.id === activeId ? 'bg-se-blue-wash/50' : ''}`}>
                        <Face p={{ id: o.id, name: o.name, photo: o.photo, kind }} size={40} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline gap-2">
                            <span className={`truncate text-sm ${n ? 'font-extrabold' : 'font-semibold'} text-se-ink`}>{o.name}</span>
                            <span className="ml-auto text-[11px] text-se-muted whitespace-nowrap">{fmtTime(c.last_message?.created_at)}</span>
                          </span>
                          <span className="flex items-center gap-2">
                            <span className={`block text-sm truncate flex-1 ${n ? 'text-se-ink' : 'text-se-muted'}`}>{c.last_message?.content ?? 'Nouvelle conversation'}</span>
                            {n > 0 && <span className="se-badge bg-se-blue text-white" style={{ height: 18 }}>{n}</span>}
                          </span>
                          <span className={`text-[11px] ${kind === 'freelance' ? 'text-se-freelance-ink' : 'text-se-blue-ink'}`}>{kind === 'freelance' ? 'Auto-entrepreneur' : 'Salarié'}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Fil */}
          <div className={activeId ? '' : 'hidden md:block'}>
            {selected && who ? (
              <div className="bg-se-surface border border-se-line rounded-se shadow-se overflow-hidden flex flex-col h-[calc(100vh-14rem)] min-h-[420px]">
                <header className="flex items-center gap-3 px-4 py-3 border-b border-se-line">
                  <button type="button" onClick={() => select(undefined)} aria-label="Retour à la liste" className="md:hidden w-8 h-8 grid place-items-center rounded-se-sm hover:bg-se-surface-2 text-se-muted"><ChevronLeft className="w-5 h-5" /></button>
                  <Face p={{ id: who.id, name: who.name, photo: who.photo, kind: selected.type === 'freelancer' ? 'freelance' : 'salarie' }} size={36} />
                  <div className="min-w-0">
                    <h2 className="text-base font-extrabold text-se-ink truncate">{who.name}</h2>
                    <p className="text-xs text-se-muted">{selected.type === 'freelancer' ? 'Auto-entrepreneur' : 'Salarié'}</p>
                  </div>
                  <div className="ml-auto flex gap-1">
                    <button type="button" onClick={() => setConfirm('delete')} aria-label="Supprimer la conversation" className="w-9 h-9 grid place-items-center rounded-se-sm text-se-muted hover:bg-se-surface-2"><Trash2 className="w-4 h-4" /></button>
                    {selected.type === 'freelancer' && <button type="button" onClick={() => setConfirm('block')} aria-label="Bloquer" className="w-9 h-9 grid place-items-center rounded-se-sm text-se-danger hover:bg-se-danger-wash"><Ban className="w-4 h-4" /></button>}
                  </div>
                </header>
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-se-surface-2/40">
                  {(messages as Message[] | undefined)?.length ? (messages as Message[]).map((m) => {
                    const mine = m.sender_id === me?.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[78%] rounded-se px-3 py-2 text-sm whitespace-pre-wrap break-words ${mine ? 'bg-se-blue text-white' : 'bg-se-surface border border-se-line text-se-ink'}`}>
                          {m.content}
                          <span className={`block text-[10px] mt-1 text-right ${mine ? 'text-white/70' : 'text-se-muted'}`}>{fmtTime(m.created_at)}</span>
                        </div>
                      </div>
                    );
                  }) : <p className="text-center text-sm text-se-muted py-10">Aucun message. Écrivez le premier.</p>}
                  <div ref={endRef} />
                </div>
                {canMessage ? (
                  <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="p-3 border-t border-se-line flex gap-2">
                    <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} placeholder="Votre message…"
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
                      className="flex-1 resize-none rounded-se-sm border border-se-line bg-se-surface px-3 py-2.5 text-sm text-se-ink focus:outline-none focus:border-se-blue max-h-32" />
                    <button type="submit" disabled={!text.trim() || sendMessage.isPending} aria-label="Envoyer" className={sePrimary}><Send className="w-4 h-4" /></button>
                  </form>
                ) : (
                  <p className="p-3 border-t border-se-line text-xs text-se-muted text-center">Vous ne pouvez plus écrire dans cette conversation.</p>
                )}
              </div>
            ) : (
              <div className="bg-se-surface border border-se-line rounded-se shadow-se min-h-[420px] grid place-items-center text-center p-8">
                <div>
                  <MessageSquare className="w-8 h-8 mx-auto text-se-muted mb-2" aria-hidden="true" />
                  <p className="font-semibold text-se-ink">Choisissez une conversation</p>
                  <p className="text-sm text-se-muted mt-1">Ou démarrez-en une avec « Nouveau message ».</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <NewMessageDialog isOpen={newOpen} onClose={() => setNewOpen(false)} onSelect={async (userId, type) => {
        try { const c: any = await createConversation.mutateAsync({ participantId: userId, type }); setNewOpen(false); select(c.id); }
        catch { toast.error('Impossible de créer la conversation'); }
      }} />

      <SeModal open={!!confirm} onClose={() => setConfirm(null)} title={confirm === 'block' ? 'Bloquer cette personne ?' : 'Supprimer la conversation ?'}
        footer={<><button type="button" className={seGhost} onClick={() => setConfirm(null)}>Annuler</button>
          <button type="button" className={sePrimary} onClick={doConfirm} disabled={deleteConversation.isPending || blockUser.isPending}>{confirm === 'block' ? 'Bloquer' : 'Supprimer'}</button></>}>
        <p className="text-sm text-se-ink">{confirm === 'block' ? `${who?.name ?? 'Cette personne'} ne pourra plus vous écrire et la conversation sera supprimée.` : 'La conversation sera retirée de votre liste.'}</p>
      </SeModal>
    </div>
  );
}
