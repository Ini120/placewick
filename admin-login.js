// Placewick — Admin login (prototype only)
//
// IMPORTANT: this is a front-end demo gate, not real authentication.
// It exists so the admin dashboard mockup isn't reachable by just typing
// its URL without going through a "sign in" step first. It stores a flag
// in sessionStorage and admin-dashboard.js checks for that flag before
// rendering. There is no password check, no server call and no real
// session — anyone can open devtools and set the flag themselves.
//
// When a real backend exists, replace this file's submit handler with an
// actual API call (e.g. POST /api/admin/login) that verifies credentials
// server-side, checks the user has an admin role, and returns a JWT or
// sets an HttpOnly session cookie. The redirect at the bottom of this
// file is the only line that should survive that change.

(function () {

    const form = document.getElementById("admin-login-form");
    const errorBox = document.getElementById("admin-login-error");
    const passwordInput = document.getElementById("admin-password");
    const passwordToggle = document.getElementById("admin-password-toggle");

    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener("click", function () {
            const isHidden = passwordInput.type === "password";
            passwordInput.type = isHidden ? "text" : "password";

            const icon = passwordToggle.querySelector("i");
            if (icon) {
                icon.classList.toggle("fa-eye", !isHidden);
                icon.classList.toggle("fa-eye-slash", isHidden);
            }

            passwordToggle.setAttribute(
                "aria-label",
                isHidden ? "Hide password" : "Show password"
            );
        });
    }

    if (!form) {
        return;
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const email = document.getElementById("admin-email").value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showError("Please enter your work email and password.");
            return;
        }

        // Demo-only "sign in": accept anything and mark this tab's
        // session as an admin session. Replace with a real API call
        // before this ships past prototype stage.
        try {
            sessionStorage.setItem("placewickAdminSession", "true");
            sessionStorage.setItem("placewickAdminEmail", email);
        } catch (err) {
            // sessionStorage unavailable (private mode, etc.) — fall
            // through and redirect anyway, since this is a demo gate.
        }

        window.location.href = "admin-dashboard.html";
    });

    function showError(message) {
        const textEl = document.getElementById("admin-login-error-text");
        if (textEl) {
            textEl.textContent = message;
        }
        errorBox.classList.add("is-visible");
    }

})();
