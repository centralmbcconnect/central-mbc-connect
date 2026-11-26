import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import {
  BookOpen, CalendarDays, Church, CircleUserRound, Clock3, ExternalLink,
  Heart, House, MapPin, Menu, Bell, Play, RefreshCw, X
} from 'lucide-react';
import { devotionals } from './data.js';

const SUPABASE_URL = 'https://ksdjtqnfrrdvfyzocuai.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_NoaBJAT3yRLAkCk-lTqbiw_ZAr4-KxP';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
const tabs = [
  { id: 'home', label: 'Home', Icon: House },
  { id: 'events', label: 'Events', Icon: CalendarDays },
  { id: 'devotional', label: 'Devotional', Icon: BookOpen },
  { id: 'sermons', label: 'Sermons', Icon: Play },
  { id: 'members', label: 'Members', Icon: CircleUserRound }
];

function safeText(value) { return typeof value === 'string' ? value : ''; }
function formatDate(value) {
  return new Date(value).toLocaleString('en-US', {
    timeZone: 'America/Chicago', weekday: 'long', month: 'long',
    day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
  });
}
function videoId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') return parsed.pathname.slice(1);
    if (parsed.hostname.endsWith('youtube.com')) {
      if (parsed.pathname === '/watch') return parsed.searchParams.get('v');
      return parsed.pathname.split('/').filter(Boolean).at(-1);
    }
  } catch {}
  return '';
}

export default function App() {
  const [tab, setTab] = useState('home');
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [sermons, setSermons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offlineMonths, setOfflineMonths] = useState(() => {
    try { return JSON.parse(localStorage.getItem('central-offline-devotionals') || '[]'); }
    catch { return []; }
  });
  const [monthIndex, setMonthIndex] = useState(0);
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [memberMessage, setMemberMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const currentMonth = devotionals[monthIndex];
  const greeting = useMemo(() => new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', weekday: 'long', month: 'long', day: 'numeric'
  }).format(new Date()), []);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError('');
      try {
        const [a, e, s] = await Promise.all([
          supabase.from('church_announcements').select('id,title,content,created_at')
            .eq('published', true).order('created_at', { ascending: false }).limit(5),
          supabase.from('church_events').select('id,title,description,location,starts_at')
            .eq('published', true).gte('starts_at', new Date().toISOString())
            .order('starts_at', { ascending: true }).limit(20),
          supabase.from('church_sermons').select('id,title,description,youtube_video_id,created_at')
            .eq('published', true).order('created_at', { ascending: false }).limit(12)
        ]);
        if (a.error) throw a.error;
        if (e.error) throw e.error;
        if (s.error) throw s.error;
        if (!active) return;
        setAnnouncements(a.data || []); setEvents(e.data || []); setSermons(s.data || []);
      } catch {
        if (active) setError('Church updates need an internet connection right now. Your saved devotionals remain available.');
      } finally { if (active) setLoading(false); }
    }
    load();
    supabase.auth.getSession().then(({ data }) => active && setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, value) => setSession(value));
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  function saveOffline() {
    const next = offlineMonths.includes(monthIndex)
      ? offlineMonths.filter((i) => i !== monthIndex)
      : [...offlineMonths, monthIndex].sort((a, b) => a - b);
    setOfflineMonths(next);
    localStorage.setItem('central-offline-devotionals', JSON.stringify(next));
  }

  async function remind(event) {
    if (!Capacitor.isNativePlatform()) {
      setMemberMessage('Event reminders are available after installing the Android or iPhone app.');
      return;
    }
    try {
      let permission = await LocalNotifications.checkPermissions();
      if (permission.display !== 'granted') permission = await LocalNotifications.requestPermissions();
      if (permission.display !== 'granted') {
        setMemberMessage('Allow notifications in your device settings to set event reminders.');
        return;
      }
      const reminderAt = new Date(new Date(event.starts_at).getTime() - 60 * 60 * 1000);
      if (reminderAt <= new Date()) {
        setMemberMessage('This event starts in less than an hour, so a reminder cannot be scheduled.');
        return;
      }
      await LocalNotifications.schedule({ notifications: [{
        id: Math.floor(Date.now() % 2147483647),
        title: 'Central MBC Connect',
        body: safeText(event.title) + ' begins in one hour.',
        schedule: { at: reminderAt },
        extra: { eventId: event.id }
      }]});
      setMemberMessage('Reminder set for one hour before ' + safeText(event.title) + '.');
    } catch {
      setMemberMessage('Could not set that reminder. Please check notification permissions.');
    }
  }

  async function signIn(e) {
    e.preventDefault(); setBusy(true); setMemberMessage('');
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (authError) { setMemberMessage('Sign-in was not successful. Check your email and password, then try again.'); return; }
    setSession(data.session); setPassword('');
    setMemberMessage('You are signed in. Member-only resources will appear here as access is enabled for your account.');
  }
  async function signOut() {
    setBusy(true); const { error: authError } = await supabase.auth.signOut(); setBusy(false);
    setMemberMessage(authError ? 'Could not sign out. Please try again.' : 'You are signed out.');
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand-mark"><Church size={22} strokeWidth={2.2} /></div>
      <div className="brand-copy"><span>Central MBC</span><small>CONNECT</small></div>
      <button className="icon-button" aria-label="Refresh church updates" onClick={() => window.location.reload()}><RefreshCw size={19} /></button>
    </header>

    <main className="screen">
      {tab === 'home' && <section className="page">
        <div className="hero">
          <div className="eyebrow">{greeting} · NEW ORLEANS</div>
          <h1>Rooted in Christ.<br /><em>Connected in community.</em></h1>
          <p>Welcome to Central Missionary Baptist Church.</p>
          <button className="hero-action" onClick={() => setTab('events')}>See upcoming events <CalendarDays size={17} /></button>
        </div>
        <section className="section">
          <div className="section-heading"><div><span className="eyebrow">STAY IN THE KNOW</span><h2>Church announcements</h2></div></div>
          {loading ? <p className="muted">Loading church updates…</p> : error ? <p className="notice">{error}</p> :
            announcements.length ? announcements.map((item) => <article className="notice-card" key={item.id}>
              <span className="pill">ANNOUNCEMENT</span><h3>{safeText(item.title)}</h3><p>{safeText(item.content)}</p>
            </article>) : <p className="muted">No new announcements right now.</p>}
        </section>
        <section className="service-card">
          <div className="service-icon"><Clock3 size={19} /></div>
          <div><span className="eyebrow">WORSHIP WITH US</span><p><strong>Sunday Worship</strong> · 7:00 AM</p><p><strong>Sunday School</strong> · 9:15 AM</p><p><strong>Wednesday Bible Study</strong> · 4:45 PM</p></div>
        </section>
        <section className="section">
          <div className="section-heading"><div><span className="eyebrow">GATHER WITH US</span><h2>Coming up</h2></div><button className="text-button" onClick={() => setTab('events')}>All events</button></div>
          {events.slice(0, 3).map((event) => <EventCard key={event.id} event={event} onRemind={remind} />)}
          {!loading && !events.length && <p className="muted">No upcoming events have been posted.</p>}
        </section>
        <a className="address-card" href="https://maps.google.com/?q=1438+Alabo+Street,+New+Orleans,+LA+70117" target="_blank" rel="noreferrer">
          <MapPin size={20} /><span><strong>Visit Central MBC</strong><small>1438 Alabo Street · New Orleans, LA 70117</small></span><ExternalLink size={16} />
        </a>
      </section>}

      {tab === 'events' && <section className="page">
        <div className="page-intro"><span className="eyebrow">CHURCH CALENDAR</span><h1>Upcoming events</h1><p>Browse what’s happening at Central, month by month.</p></div>
        {memberMessage && <p className="status">{memberMessage}<button aria-label="Dismiss" onClick={() => setMemberMessage('')}><X size={15}/></button></p>}
        {loading ? <p className="muted">Loading events…</p> : error ? <p className="notice">{error}</p> : events.length ?
          <div className="stack">{events.map((event) => <EventCard key={event.id} event={event} onRemind={remind} />)}</div> :
          <div className="empty"><CalendarDays size={24}/><strong>No upcoming events</strong><span>Check again soon for new church events.</span></div>}
      </section>}

      {tab === 'devotional' && <section className="page">
        <div className="page-intro"><span className="eyebrow">2027 · ROOTED AND ESTABLISHED</span><h1>Weekly devotional</h1><p>Colossians 2:6–7 · Read, reflect, pray, and put the Word into practice.</p></div>
        <div className="month-selector">
          <button aria-label="Previous month" disabled={monthIndex === 0} onClick={() => setMonthIndex(monthIndex - 1)}>‹</button>
          <div><span className="eyebrow">MONTHLY THEME</span><h2>{currentMonth.month} 2027</h2></div>
          <button aria-label="Next month" disabled={monthIndex === devotionals.length - 1} onClick={() => setMonthIndex(monthIndex + 1)}>›</button>
        </div>
        <div className="devotional-theme"><span>{currentMonth.theme}</span><strong>{currentMonth.verse}</strong></div>
        <div className="stack">{currentMonth.weeks.map(([topic, verse], index) => <article className="week-card" key={topic}>
          <span className="pill">WEEK {index + 1}</span><h3>{topic}</h3><p><BookOpen size={15} /> {verse}</p>
        </article>)}</div>
        <button className={offlineMonths.includes(monthIndex) ? 'outline-button saved' : 'outline-button'} onClick={saveOffline}>
          <Heart size={17} fill={offlineMonths.includes(monthIndex) ? 'currentColor' : 'none'} />
          {offlineMonths.includes(monthIndex) ? 'Saved for offline reading' : 'Save this month for offline reading'}
        </button>
        <p className="fine-print">{offlineMonths.length} of 12 months saved on this device. Devotionals are included in the app and stay available offline.</p>
      </section>}

      {tab === 'sermons' && <section className="page">
        <div className="page-intro"><span className="eyebrow">WATCH AND GROW</span><h1>Sermons & videos</h1><p>Worship messages from Central Missionary Baptist Church.</p></div>
        {loading ? <p className="muted">Loading videos…</p> : sermons.length ? <div className="stack">{sermons.map((sermon) => {
          const id = sermon.youtube_video_id || videoId(sermon.youtube_url || '');
          return <article className="video-card" key={sermon.id || id}>
            {id && <div className="video-frame"><iframe src={'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id)} title={safeText(sermon.title) || 'Central MBC sermon'} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>}
            <div className="video-copy"><span className="pill">CENTRAL MBC</span><h3>{safeText(sermon.title)}</h3><p>{safeText(sermon.description)}</p></div>
          </article>;
        })}</div> : <div className="empty"><Play size={24}/><strong>Watch Central on YouTube</strong><span>Find sermons and worship videos on our channel.</span><a className="outline-button" href="https://www.youtube.com/@CentralMBCNOLA" target="_blank" rel="noreferrer">Open YouTube <ExternalLink size={16}/></a></div>}
      </section>}

      {tab === 'members' && <section className="page">
        <div className="page-intro"><span className="eyebrow">CENTRAL MBC CONNECT</span><h1>Members</h1><p>Sign in to access resources made available to church members.</p></div>
        <div className="member-panel">
          <div className="member-icon"><CircleUserRound size={26}/></div>
          {session ? <><h2>You’re signed in</h2><p className="muted">{session.user.email}</p><p className="status-copy">Member-only resources will appear here as access is enabled for your account.</p><button className="outline-button" disabled={busy} onClick={signOut}>Sign out</button></> :
          <><h2>Member sign in</h2><p className="muted">Use your Central MBC Connect account.</p>
            <form className="login-form" onSubmit={signIn}>
              <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
              <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
              <button className="primary-button" disabled={busy}>{busy ? 'Signing in…' : 'Sign in securely'}</button>
            </form>
            <p className="help-text">Need help with access? Contact the church office at <a href="tel:+15049474637">(504) 947-4637</a>.</p>
          </>}
          {memberMessage && <p className="status-copy" role="status">{memberMessage}</p>}
        </div>
        <div className="privacy-note">Private member information is protected by Supabase account permissions. This app does not show the church administrator’s private contact directory.</div>
      </section>}
    </main>

    <nav className="tabbar" aria-label="Main navigation">
      {tabs.map(({ id, label, Icon }) => <button key={id} className={tab === id ? 'tab active' : 'tab'} onClick={() => { setTab(id); if (id !== 'members' && id !== 'events') setMemberMessage(''); }}>
        <Icon size={20} strokeWidth={tab === id ? 2.4 : 1.8}/><span>{label}</span>
      </button>)}
    </nav>
  </div>;
}

function EventCard({ event, onRemind }) {
  return <article className="event-card">
    <div className="date-mark"><span>{new Date(event.starts_at).toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short' }).toUpperCase()}</span><strong>{new Date(event.starts_at).toLocaleDateString('en-US', { timeZone: 'America/Chicago', day: '2-digit' })}</strong></div>
    <div className="event-copy"><h3>{safeText(event.title)}</h3><p>{formatDate(event.starts_at)}</p>{event.location && <small><MapPin size={13}/>{safeText(event.location)}</small>}{event.description && <p className="event-description">{safeText(event.description)}</p>}
      <button className="remind-button" onClick={() => onRemind(event)}><Bell size={15}/> Remind me</button>
    </div>
  </article>;
}
