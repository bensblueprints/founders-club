'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LockKeyhole, MessageSquare, Send } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { db, initials } from '@/lib/api';

function MessagesContent() {
    const { user, ready } = useAuth();
    const params = useSearchParams();
    const [inbox, setInbox] = useState([]);
    const [active, setActive] = useState(null);
    const [thread, setThread] = useState(null);
    const loadInbox = useCallback(() => user && db('messages.inbox').then(rows => {
        const wanted = params.get('to');
        if (wanted && !rows.some(r => r.otherId === wanted)) rows.unshift({otherId:wanted, otherFirstName:'New', otherLastName:'conversation', otherCompany:''});
        setInbox(rows); setActive(current => current || wanted || rows[0]?.otherId || null);
    }).catch(() => setInbox([])), [user, params]);
    useEffect(() => { loadInbox(); }, [loadInbox]);
    useEffect(() => { if (active) db('messages.thread', { otherId: active }).then(setThread).catch(() => setThread({messages:[], other:null})); }, [active]);

    async function send(event) {
        event.preventDefault(); const form = new FormData(event.currentTarget); const body = form.get('message'); if (!body?.trim() || !active) return;
        await db('messages.send', { toId: active, body }); event.currentTarget.reset();
        setThread(await db('messages.thread', { otherId: active })); loadInbox();
    }

    const other = thread?.other;
    return <main className="messages-container">
        <div className="messages-header">
            <h1>Messages</h1>
            <p>Connect privately with fellow founders</p>
        </div>
        {!ready ? <div className="loading">Loading messages…</div> : !user ? <div className="lock-state"><LockKeyhole/><h2>Sign in to view messages</h2><Link className="button primary" href="/login?next=/messages">Sign in</Link></div> : <div className="messages-layout legacy-messages-layout">
            <aside className="conversations-list">
                <div className="conversations-header">Conversations</div>
                <div>
                    {inbox.map(item => <button className={`conversation-item ${active === item.otherId ? 'active':''}`} key={item.otherId} onClick={() => setActive(item.otherId)}>
                        <span className="conversation-avatar">{initials({first_name:item.otherFirstName,last_name:item.otherLastName})}</span>
                        <span className="conversation-info">
                            <span className="conversation-name"><span>{item.otherFirstName} {item.otherLastName}</span></span>
                            <span className="conversation-preview">{item.lastBody || item.otherCompany || 'Start a conversation'}</span>
                        </span>
                    </button>)}
                    {!inbox.length && <div className="empty-conversations"><MessageSquare size={48}/><p>No messages yet</p><p><Link href="/members">Browse members</Link> and start a conversation</p></div>}
                </div>
            </aside>
            <div className="conversation-panel">
                {active ? <>
                    <div className="conversation-panel-header">
                        <span className="conversation-avatar">{initials({first_name:other?.firstName, last_name:other?.lastName})}</span>
                        <div className="panel-user-info"><h3>{other ? `${other.firstName} ${other.lastName}` : 'Conversation'}</h3><p>{other?.company || 'Founders Vietnam'}</p></div>
                    </div>
                    <div className="messages-thread">{thread?.messages?.map(m => <div key={m.id} className={`message-bubble ${m.from_me ? 'sent' : 'received'}`}>{m.body}</div>)}{thread && !thread.messages.length && <div className="empty-conversation"><MessageSquare size={60}/><p>Say hello and mention where you met.</p></div>}</div>
                    <form className="compose-area" onSubmit={send}><textarea name="message" placeholder="Type a message..." rows={1} /><button className="send-btn" aria-label="Send"><Send size={20}/></button></form>
                </> : <div className="empty-conversation"><MessageSquare size={60}/><p>Select a conversation to view messages</p></div>}
            </div>
        </div>}
    </main>;
}

export default function MessagesPage() {
    return <Suspense fallback={<div className="loading">Loading messages…</div>}><MessagesContent /></Suspense>;
}
