"""
End-to-end test for the Plumbline website.
Runs the real pages in Chromium against an in-memory stand-in for Supabase
(auth, database, storage), so no Supabase project is needed.
Usage: ./run_tests.sh   (or: python3 e2e_test.py [path/to/website])
"""
import json, re, subprocess, sys, time, uuid, base64, os, tempfile
from urllib.parse import urlparse, parse_qs, unquote
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'website'))
V = os.path.join(HERE, '.vendor')   # filled by run_tests.sh
CHROME = os.environ.get('CHROME_PATH')  # optional: use an installed Chrome instead of Playwright's Chromium
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8080', '--directory', SITE], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
DB = {'users': {}, 'profiles': {}, 'messages': [], 'subs': [], 'files': [], 'apps': {}, 'invites': [], 'members': [], 'appeals': [], 'payouts': [], 'notes': [], 'links': [],
      'tasks': [{'id': 'rust-borrow-01', 'title': 'Diagnose a Rust borrow-checker error', 'type': 'Code review', 'field': 'Software engineering', 'mins': '20 min', 'rate_cents': 15000, 'prompt': 'Why does this fail?', 'a': 'A borrow conflict.', 'b': 'Vectors are fixed.', 'active': True},
                {'id': 'chem-ice-01', 'title': 'Why does ice float?', 'type': 'Fact-checking', 'field': 'Chemistry', 'mins': '10 min', 'rate_cents': 8000, 'prompt': 'Explain.', 'a': 'Air bubbles.', 'b': 'Lower density.', 'active': True}]}
UID = str(uuid.uuid4())
CORS = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Expose-Headers': '*'}
errors = []
fails = []

def jwt(uid, email):
    b = lambda d: base64.urlsafe_b64encode(json.dumps(d).encode()).decode().rstrip('=')
    return b({'alg': 'HS256', 'typ': 'JWT'}) + '.' + b({'sub': uid, 'email': email, 'role': 'authenticated', 'exp': int(time.time()) + 3600, 'aud': 'authenticated'}) + '.sig'

def session(email):
    user = {'id': UID, 'email': email, 'aud': 'authenticated', 'role': 'authenticated', 'identities': [{'id': '1'}], 'app_metadata': {}, 'user_metadata': {}, 'created_at': '2026-01-01T00:00:00Z'}
    return {'access_token': jwt(UID, email), 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': int(time.time()) + 3600, 'refresh_token': 'r', 'user': user}

def handle(route):
    req = route.request
    u = urlparse(req.url); path = u.path; q = parse_qs(u.query)
    if req.method == 'OPTIONS':
        return route.fulfill(status=204, headers=CORS)
    body = None
    try: body = req.post_data_json
    except Exception: body = None
    J = lambda obj, status=200: route.fulfill(status=status, headers={**CORS, 'Content-Type': 'application/json'}, body=json.dumps(obj))
    if path == '/auth/v1/signup':
        DB['users'][body['email']] = body['password']
        meta = body.get('data') or {}
        DB['profiles'][UID] = {'id': UID, 'email': body['email'], 'name': meta.get('name'), 'country': meta.get('country'), 'heard': meta.get('heard'), 'role': meta.get('role'), 'invite_code': meta.get('ref'), 'langs': ['English'], 'other_fields': [], 'task_types': [], 'training_done': [], 'verification': 'not_submitted', 'step': 0, 'max_step': 0, 'completed_at': None, 'quiz_score': None, 'payout': None, 'paused': False}
        return J(session(body['email']))
    if path == '/auth/v1/token':
        if DB['users'].get(body.get('email')) == body.get('password'): return J(session(body['email']))
        return J({'error': 'invalid_grant', 'error_description': 'Invalid login credentials', 'msg': 'Invalid login credentials', 'code': 'invalid_credentials'}, 400)
    if path == '/auth/v1/user':
        return J(session(list(DB['users'])[0])['user'])
    if path == '/auth/v1/logout':
        return route.fulfill(status=204, headers=CORS)
    if path == '/rest/v1/rpc/is_admin':
        return J('admin.html' in req.frame.url or DB.get('is_admin', False))
    if path == '/rest/v1/rpc/grade_quiz':
        res = [a == k for a, k in zip(body['p_answers'], [1, 2, 0])]; DB['profiles'][UID]['quiz_score'] = sum(res); DB['profiles'][UID]['quiz_attempts'] = DB['profiles'][UID].get('quiz_attempts', 0) + 1
        return J({'score': sum(res), 'results': res})
    if path == '/rest/v1/rpc/record_payout':
        due = [s for s in DB['subs'] if s.get('status') == 'approved' and not s.get('payout_id')]
        pid = len(DB['payouts']) + 1
        DB['payouts'].append({'id': pid, 'user_id': UID, 'amount_cents': sum(s['pay_cents'] for s in due), 'method': 'PayPal', 'reference': body['p_reference'], 'created_at': '2026-11-06T08:00:00Z'})
        for s in due: s['payout_id'] = pid
        return J(pid)
    if path.startswith('/rest/v1/tasks'):
        if req.method == 'GET': return J(DB['tasks'])
        DB['tasks'].append(dict(body, created_at='2026-11-06T08:00:00Z')); return route.fulfill(status=201, headers=CORS)
    if path.startswith('/rest/v1/payouts'): return J(DB['payouts'])
    if path.startswith('/rest/v1/notifications'):
        if req.method == 'PATCH':
            for n in DB['notes']: n.update(body)
            return route.fulfill(status=204, headers=CORS)
        return J(DB['notes'])
    if path.startswith('/rest/v1/appeals'):
        if req.method == 'GET': return J(DB['appeals'])
        if req.method == 'PATCH':
            DB['appeals'][0].update(body)
            if body.get('status') == 'upheld': DB['profiles'][UID].update(banned_at=None, ban_reason=None)
            return route.fulfill(status=204, headers=CORS)
        row = dict(body, id=len(DB['appeals']) + 1, user_id=UID, status='open', response=None, created_at='2026-11-06T08:00:00Z'); DB['appeals'].append(row); return J(row, 201)
    if path == '/rest/v1/rpc/get_invite':
        if body.get('p_code') == 'abc123def0': return J([{'role': None, 'task_id': 'chem-ice-01', 'task_title': 'Why does ice float?'}])
        return J([{'role': i['role'], 'task_id': i['task_id'], 'task_title': 'Why does ice float?' if i['task_id'] else None} for i in DB['invites'] if i['code'] == body.get('p_code')])
    if path == '/rest/v1/rpc/invite_stats':
        return J([{'code': i['code'], 'joined': 2, 'finished': 1} for i in DB['invites']])
    if path == '/rest/v1/rpc/join_project':
        for m in DB['members']:
            if m['project'] == body.get('p_project'): m['status'] = 'joined'
        return J(True)
    if path.startswith('/rest/v1/task_projects'):
        if req.method == 'DELETE': return route.fulfill(status=204, headers=CORS)
        if req.method == 'POST': DB['links'].extend(body if isinstance(body, list) else [body]); return route.fulfill(status=201, headers=CORS)
        return J([{'task_id': 'rust-borrow-01', 'project': 'Rust Systems Reviewer'}, {'task_id': 'chem-ice-01', 'project': 'Chemistry Expert'}] + DB['links'])
    if path.startswith('/rest/v1/project_members'):
        if req.method == 'GET': return J(DB['members'])
        DB['members'].append(dict(body, status='invited')); return route.fulfill(status=201, headers=CORS)
    if path.startswith('/rest/v1/invites'):
        if req.method == 'GET': return J(DB['invites'])
        row = dict(body, code='code%06d' % len(DB['invites']), inviter_id=UID); DB['invites'].append(row); return J(row, 201)
    if path.startswith('/rest/v1/profiles'):
        if req.method == 'GET' and 'id' not in q:
            return J(list(DB['profiles'].values()))
        if req.method == 'GET':
            p = DB['profiles'].get(UID)
            if 'vnd.pgrst.object' in (req.headers.get('accept') or ''):
                return J(p) if p else J({'message': 'none', 'code': 'PGRST116'}, 406)
            return J([p] if p else [])
        if req.method == 'PATCH':
            DB['profiles'][UID].update(body); return route.fulfill(status=204, headers=CORS)
    if path.startswith('/rest/v1/applications'):
        if req.method == 'GET': return J([dict(a, id=i + 1) for i, a in enumerate(DB['apps'].values())])
        if req.method == 'PATCH':
            list(DB['apps'].values())[int(q['id'][0].split('.')[1]) - 1].update(body); return route.fulfill(status=204, headers=CORS)
        DB['apps'][body['role']] = body; return route.fulfill(status=201, headers=CORS)
    if path.startswith('/rest/v1/messages'):
        if req.method == 'GET': return J([dict(m, id=i + 1, status=m.get('status', 'new'), created_at='2026-11-06T08:00:00Z', details=m.get('details', {})) for i, m in enumerate(DB['messages'])])
        if req.method == 'PATCH':
            i = int(q['id'][0].split('.')[1]) - 1; DB['messages'][i].update(body); return route.fulfill(status=204, headers=CORS)
        DB['messages'].append(body); return route.fulfill(status=201, headers=CORS)
    if path.startswith('/rest/v1/task_submissions'):
        if req.method == 'GET': return J([dict(x, id=i + 1, user_id=UID, status=x.get('status', 'in_review'), created_at='2026-11-06T08:00:00Z') for i, x in enumerate(DB['subs'])])
        if req.method == 'PATCH':
            i = int(q['id'][0].split('.')[1]) - 1; DB['subs'][i].update(body)
            if body.get('status') == 'approved':
                m = body.get('approved_minutes', DB['subs'][i]['minutes']); DB['subs'][i].update(approved_minutes=m, pay_cents=m * 150 * 100 // 60)
            return route.fulfill(status=204, headers=CORS)
        DB['subs'].append(body); return route.fulfill(status=201, headers=CORS)
    if path.startswith('/storage/v1/object/sign/'):
        return J({'signedURL': '/object/sign/x?token=t'})
    if path.startswith('/storage/v1/object/'):
        DB['files'].append(path); return J({'Key': path, 'Id': '1'})
    print('UNMOCKED', req.method, req.url); return J({}, 404)

def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond: fails.append(msg)

with sync_playwright() as pw:
    b = pw.chromium.launch(**({'executable_path': CHROME} if CHROME else {}), args=['--no-sandbox'])
    ctx = b.new_context()
    ctx.route(re.compile(r'.*fonts\.(googleapis|gstatic)\.com.*'), lambda r: r.fulfill(status=200, body='', headers={'Content-Type': 'text/css'}))
    ctx.route(re.compile(r'.*cdn\.jsdelivr\.net/npm/alpinejs.*'), lambda r: r.fulfill(path=V + '/alpinejs-3.14.8/package/dist/cdn.min.js', headers={'Content-Type': 'application/javascript'}))
    ctx.route(re.compile(r'.*cdn\.jsdelivr\.net/npm/@supabase.*'), lambda r: r.fulfill(path=V + '/supabase-supabase-js-2.119.0/package/dist/umd/supabase.js', headers={'Content-Type': 'application/javascript'}))
    mode = {'configured': False}
    def cfg(r):
        src = open(SITE + '/assets/config.js').read()
        if mode['configured']:
            src = src.replace("SUPABASE_URL: ''", "SUPABASE_URL: 'https://mock.supabase.co'").replace("SUPABASE_ANON_KEY: ''", "SUPABASE_ANON_KEY: 'anon'")
        r.fulfill(body=src, headers={'Content-Type': 'application/javascript'})
    ctx.route(re.compile(r'.*/assets/config\.js'), cfg)
    ctx.route(re.compile(r'https://mock\.supabase\.co/.*'), handle)
    page = ctx.new_page()
    page.on('console', lambda m: m.type == 'error' and errors.append(m.text))
    page.on('pageerror', lambda e: errors.append('PAGEERROR ' + str(e)))
    B = 'http://localhost:8080/'

    # Unconfigured
    page.goto(B + 'index.html'); page.wait_for_timeout(400)
    check(page.locator('.setup-bar').first.is_visible(), 'setup bar shows when Supabase keys are missing')
    page.goto(B + 'help.html'); page.wait_for_timeout(300)
    page.fill('#hp-name', 'A'); page.fill('#hp-email', 'a@b.co'); page.fill('#hp-msg', 'hi'); page.click('text=Send message'); page.wait_for_timeout(300)
    check('not connected to Supabase' in page.inner_text('aside'), 'unconfigured help form explains it is not connected')

    mode['configured'] = True
    page.goto(B + 'index.html'); page.wait_for_timeout(500)
    check(page.locator('.setup-bar').count() == 0, 'setup bar hidden when configured')
    n_all = page.locator('#roles article').count()
    page.click('#roles .chip:has-text("Medicine")'); page.wait_for_timeout(100)
    check(n_all == 11 and page.locator('#roles article').count() == 1, f'home role filter ({n_all} → Medicine)')
    page.click('.demo-opt >> nth=0'); page.wait_for_timeout(150); check(page.locator('p.alert-ok').first.is_visible(), 'hero demo answers')
    page.click('.acc-btn >> nth=2'); page.wait_for_timeout(150); check(page.locator('.acc-a').nth(2).is_visible(), 'home FAQ opens')

    page.goto(B + 'help.html?ref=abc123def0'); page.wait_for_timeout(300)
    page.goto(B + 'roles.html'); page.wait_for_timeout(400)
    check(page.locator('main article').count() == 76, 'roles page lists 76 roles')
    page.fill('#rl-q', 'lifetimes'); page.wait_for_timeout(150)
    check(page.locator('main article').count() == 1, 'roles search')
    page.click('main article >> text=Apply'); page.wait_for_load_state(); page.wait_for_timeout(600)
    check('job.html?role=Rust' in page.url and page.locator('text=Log in or sign up to apply').is_visible(), 'Apply opens the job page')
    page.click('button:text-is("More")'); page.wait_for_timeout(150); check(page.locator('text=ownership, lifetimes').is_visible(), 'job description expands')
    page.click('text=Continue with email'); page.wait_for_timeout(100); check('valid email' in page.inner_text('aside [role=alert]'), 'job page validates email')
    page.fill('#job-email', 'brayo@example.com'); page.click('text=Continue with email'); page.wait_for_timeout(100)
    page.click('#job-signup'); page.wait_for_load_state(); page.wait_for_timeout(600)
    check(page.input_value('#ob-email') == 'brayo@example.com', 'email carries into sign-up')
    check(page.locator('text=You were invited to the task: Why does ice float?').is_visible(), 'invited person sees the task on sign-up')
    check('role=Rust' in page.url and page.locator('text=Applying for').is_visible(), 'Apply carries role into onboarding')

    # Onboarding
    page.click('text=Create account'); page.wait_for_timeout(100)
    check('full legal name' in page.inner_text('[role=alert]'), 'step 1 validates')
    page.fill('#ob-name', 'Brayo Test'); page.fill('#ob-email', 'brayo@example.com'); page.fill('#ob-pass', 'secret123')
    page.select_option('#ob-country', 'Kenya'); page.locator('label.check input').first.check()
    page.click('text=Create account'); page.wait_for_timeout(800)
    check(page.locator('text=What do you know deeply?').is_visible(), 'account created → step 2')
    check(page.input_value('#ob-field') == 'Software engineering', 'role pre-fills primary field')
    page.select_option('#ob-edu', "Bachelor's"); page.select_option('#ob-years', '2–5 years')
    page.click('.chip:has-text("Swahili")')
    page.click('button:visible:has-text("Continue")'); page.wait_for_timeout(600)
    check(page.locator('text=When and how do you like to work?').is_visible(), 'step 3 reached')
    page.click('.chip:has-text("Yes")'); page.select_option('#ob-hours', '5–10 hours'); page.select_option('#ob-tz', 'UTC+3 East Africa'); page.click('.chip:has-text("Code review")')
    page.click('button:visible:has-text("Continue")'); page.wait_for_timeout(600)
    check(page.locator("text=Confirm it's really you.").is_visible(), 'step 4 reached')
    page.click('button:visible:has-text("Continue")'); page.wait_for_timeout(150)
    check('Submit your ID' in page.inner_text('[role=alert]'), 'cannot skip ID step')
    IMG = os.path.join(tempfile.gettempdir(), 'pl-test-id.png')
    open(IMG, 'wb').write(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='))
    page.set_input_files('#ob-id', IMG); page.set_input_files('#ob-selfie', IMG)
    page.click('text=Submit for verification'); page.wait_for_timeout(800)
    check(page.locator('text=Submitted — under review').is_visible() and len(DB['files']) == 2, 'ID + selfie uploaded, status pending')
    page.click('button:visible:has-text("Continue")'); page.wait_for_timeout(600)
    for qi, oi in [(0, 1), (1, 2), (2, 0)]:
        page.locator('div[x-show="step === 4"] fieldset').nth(qi).locator('.opt-btn').nth(oi).click()
    page.click('text=Check my answers'); page.wait_for_timeout(100)
    check(page.locator('text=Passed — 3 of 3').is_visible(), 'skills check passes')
    page.click('button:visible:has-text("Continue")'); page.wait_for_timeout(600)
    for i in range(4):
        page.locator('button:visible:has-text("Mark complete")').first.click(); page.wait_for_timeout(150)
    check(page.locator('text=4 of 4 done.').is_visible(), 'training complete')
    page.click('button:visible:has-text("Continue")'); page.wait_for_timeout(600)
    page.locator('div[x-show="step === 6"] label.check input').nth(0).check(); page.locator('div[x-show="step === 6"] label.check input').nth(1).check()
    page.fill('#ob-sign', 'Wrong Name'); page.select_option('#ob-payout', 'Mobile money')
    page.click('text=Sign and finish'); page.wait_for_timeout(150)
    check('must match' in page.inner_text('[role=alert]'), 'signature must match name')
    page.fill('#ob-sign', 'brayo test'); page.click('text=Sign and finish'); page.wait_for_timeout(700)
    prof = DB['profiles'][UID]
    check(page.locator('text=You’re in, Brayo.').is_visible() and prof.get('completed_at') and prof.get('role') == 'Rust Systems Reviewer' and 'Swahili' in prof.get('langs'), 'onboarding finished and saved to database')
    page.reload(); page.wait_for_timeout(900)
    check(page.locator('text=You’re in, Brayo.').is_visible(), 'reload resumes from database')

    # Workspace
    page.click('text=Start your first task'); page.wait_for_load_state(); page.wait_for_timeout(900)
    check(page.locator('text=Welcome, Brayo.').is_visible(), 'workspace greets signed-in fellow')
    check(page.locator('button:visible:has-text("Start task")').count() == 0 and 'Once your identity is verified' in page.inner_text('#ws-waiting'), 'no tasks before verification')
    DB['profiles'][UID]['verification'] = 'verified'; DB['members'] = [{'user_id': UID, 'project': 'Rust Systems Reviewer', 'status': 'invited'}, {'user_id': UID, 'project': 'Chemistry Expert', 'status': 'joined'}]
    page.reload(); page.wait_for_timeout(900)
    check(page.locator('#ws-projects:has-text("Rust Systems Reviewer")').is_visible() and page.locator('button:visible:has-text("Start task")').count() == 1, 'verified fellow sees the project invitation')
    page.click('text=Join project'); page.wait_for_timeout(400)
    check(DB['members'][0]['status'] == 'joined' and page.locator('button:visible:has-text("Start task")').count() == 2, 'joining a project opens its tasks')
    page.locator('button:visible:has-text("Start task")').first.click(); page.wait_for_timeout(200)
    page.click('text=Submit task'); check('Rate the accuracy' in page.inner_text('[role=alert] >> visible=true'), 'task validates')
    page.locator('.rate').nth(4).click(); page.locator('.rate').nth(5).click(); page.click('.chip:has-text("Response A")')
    page.fill('#ws-just', 'A correctly identifies the borrow conflict; B invents a rule about vectors.')
    page.click('text=Submit task'); page.wait_for_timeout(100); check('minutes you worked' in page.inner_text('[role=alert] >> visible=true'), 'task requires minutes worked')
    page.fill('#ws-mins', '30')
    page.click('text=Submit task'); page.wait_for_timeout(600)
    check(page.locator('text=Task submitted for review').is_visible() and len(DB['subs']) == 1, 'task submission saved')
    page.click('[role=tab]:has-text("Payments")'); page.select_option('#ws-payout', 'PayPal'); page.click('text=Save method'); page.wait_for_timeout(400)
    check(DB['profiles'][UID]['payout'] == 'PayPal', 'payout method saved')
    page.click('[role=tab]:has-text("Profile")'); page.check('text=Pause new task invites'); page.click('text=Save changes'); page.wait_for_timeout(400)
    check(DB['profiles'][UID]['paused'] is True, 'profile saved')
    page.click('text=Log out'); page.wait_for_load_state(); page.wait_for_timeout(500)
    page.goto(B + 'workspace.html'); page.wait_for_timeout(900)
    check('login.html' in page.url, 'workspace requires sign-in')
    page.fill('#lg-email', 'brayo@example.com'); page.fill('#lg-pass', 'nope'); page.click('button[type=submit]'); page.wait_for_timeout(500)
    check('don’t match' in page.inner_text('[role=alert]'), 'wrong password message')
    page.fill('#lg-pass', 'secret123'); page.click('button[type=submit]'); page.wait_for_timeout(1200)
    check('workspace.html' in page.url and page.locator('text=Welcome, Brayo.').is_visible(), 'log in returns to workspace')
    page.goto(B + 'job.html?role=Game%20Developer'); page.wait_for_timeout(900)
    page.click('#job-submit'); page.wait_for_timeout(100); check('at least one skill' in page.inner_text('aside [role=alert]'), 'job page requires a skill')
    page.click('aside .chip:has-text("Unity")'); page.click('#job-submit'); page.wait_for_timeout(500)
    check(DB['apps'].get('Game Developer', {}).get('skills') == ['Unity'] and page.locator('text=Application saved.').is_visible(), 'signed-in fellow applies with chosen skills')
    page.goto(B + 'job.html?role=Physics%20Expert'); page.wait_for_timeout(900)
    check(page.locator('text=Your other applications stay active').is_visible(), 'job page confirms other applications stay')
    page.click('aside .chip:has-text("Thermodynamics")'); page.click('#job-submit'); page.wait_for_timeout(500)
    check(len(DB['apps']) == 2 and DB['profiles'][UID]['role'] == 'Rust Systems Reviewer', 'a new application keeps the earlier ones')
    page.goto(B + 'job.html?role=Physics%20Expert'); page.wait_for_timeout(900)
    page.click('aside .chip:has-text("Quantum")'); page.click('#job-submit'); page.wait_for_timeout(500)
    check(len(DB['apps']) == 2 and len(DB['apps']['Physics Expert']['skills']) == 2, 'reapplying updates skills without a duplicate')
    page.goto(B + 'workspace.html'); page.wait_for_timeout(900)
    check(DB['profiles'][UID].get('invite_code') == 'abc123def0', 'invite code saved at sign-up')
    check(page.locator('#ws-invited:has-text("Why does ice float?")').is_visible(), 'invited task shown in workspace')
    page.click('[role=tab]:has-text("Refer & invite")'); page.select_option('#inv-role', 'Physics Expert'); page.select_option('#inv-task', 'chem-ice-01'); page.click('#inv-create'); page.wait_for_timeout(400)
    link = page.input_value('.inv-link')
    check(len(DB['invites']) == 1 and 'job.html?role=Physics%20Expert&ref=code000000' in link and page.locator('#inv-list:has-text("0 joined · 0 finished onboarding")').is_visible(), 'fellow creates a project and task invite')
    page.select_option('#inv-role', 'Physics Expert'); page.select_option('#inv-task', 'chem-ice-01'); page.click('#inv-create'); page.wait_for_timeout(200)
    check(len(DB['invites']) == 1 and page.locator('text=You already have this link').is_visible(), 'duplicate invite is not created')
    page.goto(link); page.wait_for_timeout(900)
    check(page.locator('aside >> text=You were invited to the task: Why does ice float?').is_visible(), 'invite link opens the job with the invitation')
    page.goto(B + 'workspace.html#refer'); page.wait_for_timeout(900)
    check(page.locator('#inv-list:has-text("2 joined · 1 finished onboarding")').is_visible(), 'invite link shows who joined')
    page.click('[role=tab]:has-text("Tasks")'); page.wait_for_timeout(150)
    t = page.inner_text('#ws-apps'); page.wait_for_timeout(50); check(all(x in t for x in ['Rust Systems Reviewer', 'Game Developer', 'Physics Expert']), 'workspace lists all applications')
    page.click('text=Log out'); page.wait_for_load_state(); page.wait_for_timeout(500)
    page.goto(B + 'job.html?role=Game%20Developer'); page.wait_for_timeout(700)
    page.fill('#job-email', 'brayo@example.com'); page.click('text=Continue with email'); page.fill('#job-pass', 'secret123'); page.click('#job-login'); page.wait_for_timeout(800)
    check('job.html' in page.url and page.locator('aside .chip[aria-pressed="true"]:has-text("Unity")').is_visible(), 'logging in on the job page keeps you there with your skills')
    page.goto(B + 'login.html?next=job.html%3Frole%3DFP%2526A%2520Analyst'); page.wait_for_timeout(700); page.click('text=Continue →'); page.wait_for_load_state(); page.wait_for_timeout(700)
    check(page.locator('article h1').first.inner_text() == 'FP&A Analyst', 'login returns to the job page')

    page.goto(B + 'help.html'); page.wait_for_timeout(800)
    check(page.input_value('#hp-email') == 'brayo@example.com', 'help form pre-fills signed-in email')
    page.fill('#hp-q', 'password'); page.wait_for_timeout(100)
    check(page.locator('.acc-item').count() >= 1, 'help search')
    page.fill('#hp-msg', 'I need help with payouts.'); page.click('text=Send message'); page.wait_for_timeout(600)
    check(page.locator('text=Message sent.').is_visible() and DB['messages'][-1]['kind'] == 'support', 'help message stored')
    page.goto(B + 'labs.html'); page.wait_for_timeout(500)
    page.click('#coverage .chip:has-text("Languages")'); check(page.locator('text=Amharic').is_visible(), 'labs coverage chips')
    page.fill('#lb-name', 'Ana'); page.fill('#lb-email', 'ana@lab.ai'); page.fill('#lb-co', 'Lab'); page.fill('#lb-msg', 'Need eval data.')
    page.click('text=Request a scoping call'); page.wait_for_timeout(600)
    check(page.locator('text=Request sent.').is_visible() and DB['messages'][-1]['kind'] == 'labs', 'labs request stored')
    page.goto(B + 'legal.html#privacy'); page.wait_for_timeout(500)
    check(page.locator('article h2').inner_text() == 'Privacy policy', 'legal deep link')
    page.goto(B + 'index.html'); page.wait_for_timeout(700)
    check(page.locator('#nav-cta >> text=Workspace').is_visible(), 'header shows Workspace when signed in')

    DB['profiles'][UID]['verification'] = 'pending'
    page.goto(B + 'admin.html'); page.wait_for_timeout(1200)
    check(page.locator('h1.h2:has-text("Admin")').is_visible(), 'admin dashboard opens for admins')
    check(page.locator('tbody tr:has-text("Brayo Test")').count() == 1, 'pending applicant listed')
    page.click('tbody >> text=Brayo Test'); page.wait_for_timeout(200)
    check(page.locator('aside dd:has-text("Rust Systems Reviewer"):has-text("Game Developer")').count() == 1, 'applicant details shown')
    with ctx.expect_page() as newp:
        page.click('aside >> text=View ID')
    newp.value.close()
    check(True, 'ID document opens via signed link')
    page.click('aside >> text=Verify identity'); page.wait_for_timeout(500)
    check(DB['profiles'][UID]['verification'] == 'verified', 'admin verifies identity')
    page.select_option('#ad-project', 'Physics Expert'); page.click('#ad-invite'); page.wait_for_timeout(400)
    check(any(m['project'] == 'Physics Expert' and m['status'] == 'invited' for m in DB['members']), 'admin invites a verified fellow to a project')
    page.click('[role=tab]:has-text("Task submissions")'); page.wait_for_timeout(200)
    page.click('article >> button:visible:text-is("Reject")'); page.wait_for_timeout(100); check('why this work was rejected' in page.inner_text('[role=alert] >> visible=true') and DB['subs'][0].get('status', 'in_review') == 'in_review', 'rejecting needs a reason')
    page.fill('.ad-mins >> visible=true', '15'); page.click('article >> button:visible:text-is("Approve")'); page.wait_for_timeout(500)
    check(DB['subs'][0].get('pay_cents') == 3750 and DB['subs'][0].get('approved_minutes') == 15, 'approved minutes set the pay')
    check(DB['subs'][0].get('status') == 'approved', 'admin approves task'); print('SUB', DB['subs'][0], page.locator('section:visible').all_inner_texts()[:1])
    page.click('[role=tab]:has-text("Messages")'); page.locator('button:visible:has-text("Mark handled")').first.click(); page.wait_for_timeout(500)
    check(DB['messages'][0].get('status') == 'handled', 'admin marks message handled')
    with page.expect_download() as dl:
        page.click('[role=tab]:has-text("Applicants")'); page.click('.chip:has-text("All")'); page.click('text=Export CSV')
    check('Brayo Test' in open(dl.value.path()).read(), 'applicant CSV export')
    page.click('tbody >> text=Brayo Test'); page.wait_for_timeout(200)
    check(page.locator('#ad-apps:has-text("Game Developer")').is_visible(), 'admin sees each application')
    page.locator('#ad-apps button:has-text("Accept")').first.click(); page.wait_for_timeout(400)
    check(DB['apps']['Game Developer']['status'] == 'accepted' and any(m['project'] == 'Game Developer' and m['status'] == 'invited' for m in DB['members']), 'accepting an application sends the project invitation')
    page.click('#ad-del-id'); page.wait_for_timeout(400)
    check(DB['profiles'][UID].get('id_front_path') is None and DB['profiles'][UID].get('selfie_path') is None, 'admin deletes ID files')
    page.click('[role=tab]:has-text("Payments")'); page.wait_for_timeout(200)
    check(page.locator('.ad-owed:has-text("$37.50")').is_visible(), 'admin sees what is owed')
    page.locator('.ad-owed button').click(); page.wait_for_timeout(100); check('payment reference' in page.inner_text('[role=alert] >> visible=true') and not DB['payouts'], 'payout needs a reference')
    page.fill('.ad-ref', 'PP-123'); page.locator('.ad-owed button').click(); page.wait_for_timeout(500)
    check(len(DB['payouts']) == 1 and DB['payouts'][0]['amount_cents'] == 3750 and page.locator('.ad-owed').count() == 0, 'admin records a payout')
    page.click('[role=tab]:has-text("Tasks")'); page.wait_for_timeout(200)
    page.click('#tk-save'); page.wait_for_timeout(100); check('Fill in the title' in page.inner_text('[role=alert] >> visible=true'), 'new task is validated')
    page.fill('#tk-title', 'New physics check'); page.fill('#tk-field', 'Physics'); page.fill('#tk-rate', '60'); page.fill('#tk-prompt', 'Why?'); page.fill('#tk-a', 'One'); page.fill('#tk-b', 'Two'); page.select_option('#tk-projects', ['Physics Expert']); page.click('#tk-save'); page.wait_for_timeout(500)
    check(any(t['title'] == 'New physics check' and t['rate_cents'] == 6000 for t in DB['tasks']) and {'task_id': DB['tasks'][-1]['id'], 'project': 'Physics Expert'} in DB['links'], 'admin adds a task to a project')
    DB['messages'].append({'ref': 'PL-LAB', 'kind': 'labs', 'name': 'Sam', 'email': 'sam@lab.co', 'company': 'Lab', 'message': 'We need chemists.'})
    page.reload(); page.wait_for_timeout(1000); page.click('[role=tab]:has-text("Labs")'); page.wait_for_timeout(200)
    page.select_option('.ad-lab:has-text("PL-LAB") select', 'proposal'); page.wait_for_timeout(400)
    check(DB['messages'][-1].get('pipeline') == 'proposal', 'admin tracks a lab request')
    page.click('[role=tab]:has-text("Applicants")'); page.click('.chip:has-text("All")'); page.click('tbody >> text=Brayo Test'); page.wait_for_timeout(200)
    page.click('#ad-ban'); page.wait_for_timeout(100); check('reason for the ban' in page.inner_text('[role=alert] >> visible=true') and not DB['profiles'][UID].get('banned_at'), 'ban requires a reason')
    page.select_option('#ad-ban-reason', 'Low quality work'); page.click('#ad-ban'); page.wait_for_timeout(400)
    check(DB['profiles'][UID].get('banned_at') and DB['profiles'][UID]['ban_reason'] == 'Low quality work', 'admin bans a user with a reason')
    page.goto(B + 'workspace.html'); page.wait_for_timeout(900)
    check(page.locator('#ws-banned:has-text("Low quality work")').is_visible() and page.locator('button:visible:has-text("Start task")').count() == 0 and page.locator('#ws-projects').is_hidden(), 'banned user sees the reason and no tasks or invitations')
    page.fill('#ws-appeal-text', 'short'); page.click('text=Send appeal'); page.wait_for_timeout(100); check(not DB['appeals'], 'appeal needs a real explanation')
    page.fill('#ws-appeal-text', 'My work was reviewed against the wrong rubric, please check it.'); page.click('text=Send appeal'); page.wait_for_timeout(400)
    check(len(DB['appeals']) == 1 and page.locator('text=Appeal received.').is_visible(), 'banned user sends an appeal')
    page.goto(B + 'admin.html'); page.wait_for_timeout(1000); page.click('[role=tab]:has-text("Appeals")'); page.wait_for_timeout(200)
    page.click('.ad-appeal button:has-text("Deny")'); page.wait_for_timeout(100); check('reply' in page.inner_text('[role=alert] >> visible=true') and DB['appeals'][0]['status'] == 'open', 'denying an appeal needs a reply')
    page.click('.ad-appeal button:has-text("Uphold")'); page.wait_for_timeout(600)
    check(DB['appeals'][0]['status'] == 'upheld' and DB['profiles'][UID].get('banned_at') is None, 'upholding an appeal removes the ban')
    DB['subs'][0].update(status='rejected', review_note='Your reasoning missed the mutable borrow.', pay_cents=0, payout_id=None); DB['apps']['Physics Expert']['status'] = 'submitted'; DB['payouts'][0].update(amount_cents=3750)
    DB['notes'].append({'id': 1, 'kind': 'verified', 'title': 'Your identity is verified', 'body': 'Next steps.', 'read_at': None, 'created_at': '2026-11-06T08:00:00Z'})
    DB['profiles'][UID]['verification'] = 'verified'
    page.goto(B + 'workspace.html'); page.wait_for_timeout(1000)
    check(page.locator('#ws-work:has-text("Your reasoning missed the mutable borrow.")').is_visible(), 'fellow sees why a task was rejected')
    check(page.locator('article:has-text("Diagnose a Rust") .pill:text-is("Rejected")').is_visible(), 'task list shows the real review status')
    check(page.inner_text('#ws-quality') == '0%', 'quality score comes from reviewed work')
    page.click('[role=tab]:has-text("Notifications (1)")'); page.wait_for_timeout(400)
    check(page.locator('#ws-notes:has-text("Your identity is verified")').is_visible() and DB['notes'][0].get('read_at') and page.locator('[role=tab]:text-is("Notifications")').count() == 1, 'notifications show and mark as read')
    page.click('[role=tab]:has-text("Payments")'); page.wait_for_timeout(200)
    check(page.locator('#ws-payouts:has-text("PP-123")').is_visible(), 'fellow sees payout history')
    page.click('[role=tab]:has-text("Tasks")'); page.wait_for_timeout(200)
    page.locator('#ws-apps div.card:has-text("Physics Expert") button:has-text("Withdraw")').click(); page.wait_for_timeout(400)
    check(DB['apps']['Physics Expert']['status'] == 'withdrawn' and DB['apps']['Game Developer']['status'] == 'accepted', 'fellow withdraws one application and keeps the rest')
    page.click('text=Log out'); page.wait_for_load_state(); page.wait_for_timeout(500)
    DB['is_admin'] = True
    page.goto(B + 'login.html'); page.wait_for_timeout(600); page.fill('#lg-email', 'brayo@example.com'); page.fill('#lg-pass', 'secret123'); page.click('button[type=submit]'); page.wait_for_timeout(1200)
    check('admin.html' in page.url, 'an admin logging in lands on the dashboard')

    # every internal link resolves
    import glob
    bad = []
    for f in glob.glob(SITE + '/*.html'):
        for href in re.findall(r'''href="'?([^"'#:]+\.html)''', open(f).read()):
            if not os.path.exists(os.path.join(SITE, href.split('?')[0])): bad.append((f, href))
    check(not bad, 'all internal links point to real pages ' + str(bad))
    b.close()
srv.terminate()
real = [e for e in errors if 'favicon' not in e and 'Failed to load resource' not in e]
check(not real, 'no JavaScript errors ' + str(real[:5]))
print('\nFAILURES:', len(fails))
