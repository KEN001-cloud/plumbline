// Plumbline — Supabase client, auth helpers and shared header/footer.
(function () {
  const cfg = window.PLUMBLINE_CONFIG || {};
  const initialHash = location.hash; // read before Supabase consumes auth tokens in the URL
  const configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  const sb = configured
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' } })
    : null;

  const NOT_CONFIGURED = 'This site is not connected to Supabase yet. Add your project URL and anon key to assets/config.js.';

  // An invite code from a link is kept until sign-up, across pages.
  const REF_KEY = 'pl_ref';
  function ref() {
    const fromUrl = new URLSearchParams(location.search).get('ref');
    if (fromUrl && /^[a-z0-9]{6,20}$/.test(fromUrl)) {
      try { localStorage.setItem(REF_KEY, fromUrl); } catch (e) { /* storage blocked */ }
      return fromUrl;
    }
    try { return localStorage.getItem(REF_KEY) || ''; } catch (e) { return ''; }
  }
  function clearRef() { try { localStorage.removeItem(REF_KEY); } catch (e) { /* storage blocked */ } }
  ref();
  async function invite(code) {
    const c = code || ref();
    if (!sb || !c) return null;
    const { data, error } = await sb.rpc('get_invite', { p_code: c });
    return error || !data ? null : (data[0] || null);
  }

  function siteBase() {
    if (cfg.SITE_URL) return cfg.SITE_URL.replace(/\/+$/, '') + '/';
    return location.origin + location.pathname.replace(/[^/]*$/, '');
  }

  function friendly(err) {
    const m = (err && (err.message || err.error_description || String(err))) || 'Something went wrong.';
    if (/Invalid login credentials/i.test(m)) return 'That email and password don’t match. Try again, or use “Forgot password?”.';
    if (/Email not confirmed/i.test(m)) return 'Please confirm your email first — check your inbox for our link.';
    if (/already registered|already been registered/i.test(m)) return 'An account with this email already exists. Log in instead.';
    if (/^Too many messages/i.test(m)) return m;
    if (/rate limit|too many/i.test(m)) return 'Too many attempts. Please wait a minute and try again.';
    if (/Password should be/i.test(m)) return 'Your password needs at least 8 characters.';
    if (/Failed to fetch|NetworkError/i.test(m)) return 'We couldn’t reach the server. Check your connection and try again.';
    return m;
  }

  async function session() {
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data.session || null;
  }

  async function profile() {
    const s = await session();
    if (!s) return null;
    const { data, error } = await sb.from('profiles').select('*').eq('id', s.user.id).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function updateProfile(patch) {
    const s = await session();
    if (!s) throw new Error('Your session has ended. Please log in again.');
    const { error } = await sb.from('profiles').update(patch).eq('id', s.user.id);
    if (error) throw error;
  }

  async function uploadFile(kind, file) {
    const s = await session();
    if (!s) throw new Error('Please log in again to upload files.');
    if (file.size > 10 * 1024 * 1024) throw new Error('Files must be 10 MB or smaller.');
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    // ID photos get a new name each time, so a replacement can be told apart from the old file.
    const path = s.user.id + '/' + kind + (kind === 'resume' ? '' : '-' + Date.now()) + '.' + ext;
    const { error } = await sb.storage.from('fellow-files').upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (error) throw error;
    return path;
  }

  function makeRef() {
    const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let r = 'PL-';
    const buf = new Uint8Array(6);
    (window.crypto || {}).getRandomValues ? crypto.getRandomValues(buf) : buf.forEach((_, i) => { buf[i] = Math.random() * 255; });
    buf.forEach((b) => { r += a[b % a.length]; });
    return r;
  }

  async function sendMessage(kind, fields) {
    if (!sb) throw new Error(NOT_CONFIGURED);
    const s = await session();
    const ref = makeRef();
    const row = Object.assign({ ref, kind, user_id: s ? s.user.id : null }, fields);
    const { error } = await sb.from('messages').insert(row);
    if (error) throw error;
    return ref;
  }

  async function requireAuth(next) {
    const s = await session();
    if (!s) {
      location.replace('login.html?next=' + encodeURIComponent(next || location.pathname.split('/').pop() || 'workspace.html'));
      return null;
    }
    return s;
  }

  async function signOut() {
    if (sb) await sb.auth.signOut();
    location.href = 'index.html';
  }

  const logo = (fill, stroke) => '<svg width="24" height="28" viewBox="0 0 26 30" aria-hidden="true"><line x1="13" y1="0" x2="13" y2="12" stroke="' + stroke + '" stroke-width="2"/><path d="M13 12 L22 20 L13 30 L4 20 Z" fill="' + fill + '"/></svg>';

  function renderChrome() {
    const header = document.getElementById('site-header');
    if (header) {
      const active = header.dataset.active || '';
      const link = (href, label, key) => '<a href="' + href + '"' + (active === key ? ' aria-current="page"' : '') + '>' + label + '</a>';
      header.className = 'site-header';
      header.innerHTML =
        (configured ? '' : '<div class="setup-bar" role="status">' + NOT_CONFIGURED + '</div>') +
        '<nav aria-label="Main">' +
        '<a class="brand" href="index.html" aria-label="Plumbline home">' + logo('var(--accent)', '#121417') + '<span>Plumbline</span></a>' +
        '<div class="nav-links">' + link('roles.html', 'Open roles', 'roles') + link('index.html#how', 'How it works', 'how') + link('labs.html', 'For AI labs', 'labs') + link('help.html', 'Help', 'help') + '</div>' +
        '<div class="nav-cta" id="nav-cta"><a class="btn btn-sm" href="login.html">Log in</a><a class="btn btn-sm btn-dark" href="apply.html">Join the fellowship</a></div>' +
        '</nav>';
      session().then((s) => {
        if (!s) return;
        const cta = document.getElementById('nav-cta');
        cta.innerHTML = '<a class="btn btn-sm btn-dark" href="workspace.html">Workspace</a><button type="button" class="btn btn-sm" id="nav-logout">Log out</button>';
        document.getElementById('nav-logout').addEventListener('click', signOut);
      }).catch(() => {});
    }
    const footer = document.getElementById('site-footer');
    if (footer) {
      footer.className = 'site-footer';
      footer.innerHTML =
        '<div class="inner">' +
        '<div style="max-width:320px"><a class="brand" href="index.html" style="color:#F7F7F4">' + logo('var(--accent-2)', '#F7F7F4') + '<span>Plumbline</span></a>' +
        '<p style="margin:16px 0 0;font-size:16px">Expert judgment, measured true — for the people building AI and the people teaching it.</p></div>' +
        '<div class="row" style="gap:48px">' +
        '<div><h3>Fellows</h3><ul><li><a href="roles.html">Open roles</a></li><li><a href="apply.html">Apply</a></li><li><a href="login.html">Log in</a></li><li><a href="workspace.html">Workspace</a></li></ul></div>' +
        '<div><h3>Company</h3><ul><li><a href="labs.html">For AI labs</a></li><li><a href="help.html">Help center</a></li><li><a href="help.html#contact">Contact</a></li></ul></div>' +
        '<div><h3>Legal</h3><ul><li><a href="legal.html#terms">Terms of service</a></li><li><a href="legal.html#privacy">Privacy policy</a></li><li><a href="legal.html#agreement">Fellow agreement</a></li></ul></div>' +
        '</div></div>' +
        '<div class="bottom"><span>© ' + new Date().getFullYear() + ' Plumbline</span><a href="#top" style="color:#A9ADA4">Back to top ↑</a></div>';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderChrome);
  else renderChrome();

  window.PL = { cfg, configured, initialHash, sb, NOT_CONFIGURED, siteBase, friendly, session, profile, updateProfile, uploadFile, sendMessage, requireAuth, signOut, ref, clearRef, invite };
})();
