export class AuthController {
  constructor({ auth, elements }) {
    this.auth = auth;
    this.elements = elements;
    this.unsubscribe = null;
  }

  async start() {
    this.bindControls();
    if (!this.auth.configured) {
      this.render(null);
      return;
    }

    this.unsubscribe = this.auth.onAuthStateChange(session => this.render(session));
    try {
      this.render(await this.auth.getSession());
    } catch (error) {
      this.render(null);
      this.showError(`Account service unavailable: ${error.message}`);
    }
  }

  bindControls() {
    this.elements.button.addEventListener("click", () => this.elements.dialog.showModal());
    this.elements.close.addEventListener("click", () => this.elements.dialog.close());
    this.elements.dialog.addEventListener("close", () => this.elements.button.focus());
    this.elements.form.addEventListener("submit", event => {
      event.preventDefault();
      this.authenticate("login");
    });
    this.elements.register.addEventListener("click", () => this.authenticate("register"));
    this.elements.signOut.addEventListener("click", () => this.signOut());
  }

  render(session) {
    const user = session?.user ?? null;

    if (!this.auth.configured) {
      this.elements.button.textContent = "Demo";
      this.elements.button.title = "Portfolio demo mode";
      this.elements.title.textContent = "Portfolio demo mode";
      this.elements.body.textContent = "No account is required. Your sketches and assets stay in this browser and can be exported as project files.";
      this.elements.form.hidden = true;
      this.elements.signOut.hidden = true;
      return;
    }

    this.elements.button.textContent = user ? user.email : "Sign in";
    this.elements.button.title = user ? `Signed in as ${user.email}` : "Open account sign in";
    this.elements.title.textContent = user ? "Signed in" : "Your Canvas Atelier account";
    this.elements.body.textContent = user
      ? `You are signed in as ${user.email}. Projects still save locally until cloud sync is added.`
      : "Sign in or create an account. The public studio remains available without an account.";
    this.elements.form.hidden = Boolean(user);
    this.elements.signOut.hidden = !user;
    this.elements.error.textContent = "";
  }

  async authenticate(mode) {
    if (!this.elements.form.reportValidity()) return;
    this.setBusy(true);
    this.elements.error.textContent = "";
    try {
      const email = this.elements.email.value.trim();
      const password = this.elements.password.value;
      if (mode === "register") await this.auth.register(email, password);
      else await this.auth.signIn(email, password);
      this.elements.password.value = "";
      this.elements.dialog.close();
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.setBusy(false);
    }
  }

  async signOut() {
    this.elements.signOut.disabled = true;
    this.elements.error.textContent = "";
    try {
      await this.auth.signOut();
      this.elements.dialog.close();
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.elements.signOut.disabled = false;
    }
  }

  setBusy(busy) {
    this.elements.submit.disabled = busy;
    this.elements.register.disabled = busy;
  }

  showError(message) {
    this.elements.error.textContent = message || "Authentication failed. Please try again.";
  }

  destroy() {
    this.unsubscribe?.();
  }
}
