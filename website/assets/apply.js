// Plumbline — fellow onboarding (apply.html)
document.addEventListener('alpine:init', () => {
  const D = window.PL_DATA;
  const LABELS = ['Account', 'Expertise', 'Availability', 'Verify identity', 'Skills check', 'Training', 'Agreement & payouts', 'Ready to task'];

  Alpine.data('apply', () => ({
    D, LABELS,
    loading: true, busy: false, err: '', notice: '',
    signedIn: false, userEmail: '', awaitingConfirm: false,
    step: 0, maxStep: 0,
    role: '', invite: null,
    f: { name: '', email: '', password: '', country: '', heard: '', agreeTerms: false, field: '', edu: '', subject: '', years: '', link: '', auth: '', hours: '', tz: '', idType: 'National ID', sign: '', payout: '', agree1: false, agree2: false },
    sec: [], langs: ['English'], types: [],
    files: { resume: null, idFront: null, selfie: null },
    onFile: { resume: '', idFront: '', selfie: '' },
    verification: 'not_submitted', verifyBusy: false,
    qa: {}, quizChecked: false, quizScore: 0, results: [],
    trained: [], openMod: 0,

    async init() {
      const params = new URLSearchParams(location.search);
      let urlRole = params.get('role') || '';
      if (params.get('email')) this.f.email = params.get('email');
      if (!PL.configured) { this.applyRole(urlRole); this.loading = false; return; }
      try {
        this.invite = await PL.invite();
        if (this.invite && !urlRole) urlRole = this.invite.role || '';
        const s = await PL.session();
        if (s) await this.loadProfile(s, urlRole); else this.applyRole(urlRole);
        PL.sb.auth.onAuthStateChange((evt, sess) => {
          if (evt === 'SIGNED_IN' && sess && !this.signedIn && !this.busy) this.loadProfile(sess, urlRole);
        });
      } catch (e) { this.err = PL.friendly(e); }
      this.loading = false;
    },

    async loadProfile(s, urlRole) {
      this.signedIn = true; this.userEmail = s.user.email; this.awaitingConfirm = false;
      const p = await PL.profile();
      if (!p) return;
      const f = this.f;
      Object.assign(f, {
        name: p.name || f.name, email: p.email || s.user.email, country: p.country || f.country, heard: p.heard || f.heard, agreeTerms: true,
        field: p.field || f.field, edu: p.edu || f.edu, subject: p.subject || f.subject, years: p.years || f.years, link: p.link || f.link,
        auth: p.work_auth || f.auth, hours: p.hours || f.hours, tz: p.tz || f.tz, idType: p.id_type || f.idType,
        sign: p.signed_name || f.sign, payout: p.payout || f.payout, agree1: !!p.signed_at || f.agree1, agree2: !!p.signed_at || f.agree2
      });
      this.sec = p.other_fields || []; this.langs = (p.langs && p.langs.length) ? p.langs : ['English']; this.types = p.task_types || [];
      this.onFile = { resume: p.resume_path ? 'On file' : '', idFront: p.id_front_path ? 'On file' : '', selfie: p.selfie_path ? 'On file' : '' };
      this.verification = p.verification || 'not_submitted';
      this.trained = p.training_done || [];
      if (p.quiz_score != null && p.quiz_score >= 2) { this.quizChecked = true; this.quizScore = p.quiz_score; }
      this.role = p.role || '';
      this.maxStep = Math.max(p.max_step || 0, 1);
      this.step = p.completed_at ? 7 : Math.max(p.step || 0, 1);
      if (urlRole && !p.role) { this.applyRole(urlRole); await PL.updateProfile({ role: this.role, field: this.f.field, langs: this.langs }).catch(() => {}); }
    },

    applyRole(title) {
      const r = D.ROLES.find((x) => x.title === title);
      if (!r) return;
      this.role = r.title;
      if (r.primary && !this.f.field) this.f.field = r.primary;
      if (r.lang && !this.langs.includes(r.lang)) this.langs = this.langs.concat([r.lang]);
    },
    async removeRole() { this.role = ''; if (this.signedIn) await PL.updateProfile({ role: null }).catch(() => {}); },

    toggle(list, v) { const i = this[list].indexOf(v); this[list] = i >= 0 ? this[list].filter((x) => x !== v) : this[list].concat([v]); this.err = ''; },
    pick(e, key) { const file = e.target.files && e.target.files[0]; this.files[key] = file || null; this.err = ''; },

    get inviteTask() { return (this.invite && this.invite.task_title) || ''; },

    get pct() { return Math.round((this.step / 7) * 100) + '%'; },
    get firstName() { return (this.f.name.trim().split(/\s+/)[0]) || 'there'; },
    get score() { return this.quizScore; },
    get passed() { return this.quizChecked && this.score >= 2; },
    get summary() {
      return [
        ['Name', this.f.name || '—'], ['Applied for', this.role || 'Any matching project'], ['Primary field', this.f.field || '—'],
        ['Other fields', this.sec.length ? this.sec.join(', ') : 'None added'], ['Languages', this.langs.join(', ')],
        ['Availability', this.f.hours || '—'], ['Payout method', this.f.payout || '—'],
        ['Identity', this.verification === 'verified' ? 'Verified' : 'Under review']
      ];
    },

    go(i) { if (i <= this.maxStep && !this.busy) { this.step = i; this.err = ''; } },
    back() { if (this.step > 0) { this.step -= 1; this.err = ''; } },

    validate() {
      const f = this.f;
      if (this.step === 0) {
        if (!f.name.trim()) return 'Please enter your full legal name.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return 'Please enter a valid email address.';
        if (!this.signedIn && f.password.length < 8) return 'Choose a password with at least 8 characters.';
        if (!f.country) return 'Please choose your country of residence.';
        if (!f.agreeTerms) return 'Please agree to the Terms of service and Privacy policy.';
      }
      if (this.step === 1) {
        if (!f.field) return 'Please choose your primary field.';
        if (!f.edu) return 'Please choose your highest education level.';
        if (!f.years) return 'Please tell us your years of experience.';
        if (!this.langs.length) return 'Please choose at least one language.';
      }
      if (this.step === 2) {
        if (!f.auth) return 'Please answer the work authorization question.';
        if (!f.hours) return 'Please choose how many hours per week you expect to work.';
        if (!f.tz) return 'Please choose your time zone.';
        if (!this.types.length) return 'Please pick at least one task type.';
      }
      if (this.step === 3 && !['pending', 'verified'].includes(this.verification)) return 'Submit your ID photo and selfie for verification to continue.';
      if (this.step === 4 && !this.passed) return this.quizChecked ? 'Please retry the skills check — you need 2 of 3.' : 'Answer all three questions, then check your answers.';
      if (this.step === 5 && this.trained.length < D.MODULES.length) return 'Please complete all four lessons.';
      if (this.step === 6) {
        if (!f.agree1 || !f.agree2) return 'Please tick both agreement boxes.';
        if (f.sign.trim().toLowerCase() !== f.name.trim().toLowerCase()) return 'Your signature must match your full legal name exactly.';
        if (!f.payout) return 'Please choose a payout method.';
      }
      return '';
    },

    async next() {
      this.err = '';
      const v = this.validate();
      if (v) { this.err = v; return; }
      if (!PL.configured) { this.err = PL.NOT_CONFIGURED; return; }
      this.busy = true;
      try {
        const f = this.f;
        const n = this.step + 1;
        const progress = { step: n, max_step: Math.max(this.maxStep, n) };
        if (this.step === 0) {
          if (!this.signedIn) {
            const { data, error } = await PL.sb.auth.signUp({
              email: f.email.trim(), password: f.password,
              options: { data: { name: f.name.trim(), country: f.country, heard: f.heard, role: this.role, ref: PL.ref() }, emailRedirectTo: PL.siteBase() + 'apply.html' }
            });
            if (error) throw error;
            if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
              throw new Error('An account with this email already exists. Log in instead.');
            }
            PL.clearRef();
            if (!data.session) { this.awaitingConfirm = true; this.busy = false; return; }
            this.signedIn = true; this.userEmail = data.session.user.email;
          }
          await PL.updateProfile(Object.assign({ name: f.name.trim(), country: f.country, heard: f.heard || null, role: this.role || null, field: f.field || null, langs: this.langs }, progress));
        } else if (this.step === 1) {
          const patch = { field: f.field, edu: f.edu, subject: f.subject || null, years: f.years, link: f.link || null, other_fields: this.sec, langs: this.langs };
          if (this.files.resume) { patch.resume_path = await PL.uploadFile('resume', this.files.resume); this.onFile.resume = this.files.resume.name; this.files.resume = null; }
          await PL.updateProfile(Object.assign(patch, progress));
        } else if (this.step === 2) {
          await PL.updateProfile(Object.assign({ work_auth: f.auth, hours: f.hours, tz: f.tz, task_types: this.types }, progress));
        } else if (this.step === 3) {
          await PL.updateProfile(progress);
        } else if (this.step === 4) {
          await PL.updateProfile(progress);
        } else if (this.step === 5) {
          await PL.updateProfile(Object.assign({ training_done: this.trained }, progress));
        } else if (this.step === 6) {
          await PL.updateProfile(Object.assign({ signed_name: f.sign.trim(), signed_at: new Date().toISOString(), payout: f.payout, completed_at: new Date().toISOString() }, progress));
        }
        this.step = n; this.maxStep = progress.max_step;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (e) {
        this.err = PL.friendly(e);
      }
      this.busy = false;
    },

    async resendConfirm() {
      this.err = ''; this.notice = '';
      try {
        const { error } = await PL.sb.auth.resend({ type: 'signup', email: this.f.email.trim(), options: { emailRedirectTo: PL.siteBase() + 'apply.html' } });
        if (error) throw error;
        this.notice = 'We sent a new confirmation email to ' + this.f.email.trim() + '.';
      } catch (e) { this.err = PL.friendly(e); }
    },

    async submitId() {
      this.err = '';
      const needId = !this.files.idFront && !this.onFile.idFront;
      const needSelfie = !this.files.selfie && !this.onFile.selfie;
      if (needId || needSelfie) { this.err = 'Please add both your ID photo and a selfie.'; return; }
      this.verifyBusy = true;
      try {
        if (this.verification === 'rejected' && !this.files.idFront && !this.files.selfie) { this.err = 'Please upload a new ID photo or selfie before submitting again.'; this.verifyBusy = false; return; }
        const before = await PL.profile();
        const patch = { id_type: this.f.idType, verification: 'pending' };
        if (this.files.idFront) { patch.id_front_path = await PL.uploadFile('id-front', this.files.idFront); this.onFile.idFront = this.files.idFront.name; this.files.idFront = null; }
        if (this.files.selfie) { patch.selfie_path = await PL.uploadFile('selfie', this.files.selfie); this.onFile.selfie = this.files.selfie.name; this.files.selfie = null; }
        await PL.updateProfile(patch);
        const old = [patch.id_front_path && before.id_front_path, patch.selfie_path && before.selfie_path].filter(Boolean);
        if (old.length) await PL.sb.storage.from('fellow-files').remove(old).catch(() => {});
        this.verification = 'pending';
      } catch (e) { this.err = PL.friendly(e); }
      this.verifyBusy = false;
    },

    async checkQuiz() {
      if (Object.keys(this.qa).length < D.QUIZ.length) { this.err = 'Please answer all three questions first.'; return; }
      if (!PL.configured) { this.err = PL.NOT_CONFIGURED; return; }
      this.err = ''; this.busy = true;
      try {
        const { data, error } = await PL.sb.rpc('grade_quiz', { p_answers: D.QUIZ.map((q, i) => this.qa[i]) });
        if (error) throw error;
        this.quizScore = data.score; this.results = data.results; this.quizChecked = true;
      } catch (e) { this.err = PL.friendly(e); }
      this.busy = false;
    },
    retryQuiz() { this.qa = {}; this.quizChecked = false; this.results = []; this.err = ''; },
    pickAnswer(qi, oi) { this.qa = Object.assign({}, this.qa, { [qi]: oi }); this.quizChecked = false; this.err = ''; },

    async completeModule(i) {
      if (!this.trained.includes(i)) this.trained = this.trained.concat([i]);
      this.openMod = i + 1 < D.MODULES.length ? i + 1 : -1;
      this.err = '';
      if (this.signedIn) PL.updateProfile({ training_done: this.trained }).catch(() => {});
    },

    async signOut() { await PL.signOut(); }
  }));
});
