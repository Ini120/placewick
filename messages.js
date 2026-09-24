// Placewick — Messages
// Switches between conversations, filters the conversation list by search,
// and lets you "send" a message (appended to the thread, client-side only —
// nothing here is actually delivered anywhere).

(function () {

    const list = document.getElementById("conversation-list");
    if (!list) return;

    const items = Array.from(list.querySelectorAll(".conversation-item"));
    const searchInput = document.getElementById("conversation-search");
    const emptyState = document.getElementById("conversation-empty");

    const threadBody = document.getElementById("thread-body");
    const threadName = document.getElementById("thread-name");
    const threadAvatar = document.getElementById("thread-avatar");
    const threadConversations = Array.from(threadBody.querySelectorAll(".thread-conversation"));

    const composer = document.getElementById("thread-composer");
    const input = document.getElementById("thread-input");

    const messagesShell = document.querySelector(".messages-shell");
    const backButton = document.getElementById("thread-back");

    function openConversation(key) {
        items.forEach(function (item) {
            item.classList.toggle("is-active", item.dataset.conversation === key);
        });

        threadConversations.forEach(function (thread) {
            thread.hidden = thread.dataset.conversation !== key;
        });

        const activeItem = items.find(function (item) {
            return item.dataset.conversation === key;
        });

        if (activeItem) {
            threadName.textContent = activeItem.dataset.name;
            threadAvatar.textContent = activeItem.querySelector(".application-logo").textContent;

            const unread = activeItem.querySelector(".conversation-unread");
            if (unread) unread.remove();
        }

        if (messagesShell) messagesShell.classList.add("is-thread-open");

        const activeThread = threadBody.querySelector(
            '.thread-conversation[data-conversation="' + key + '"]'
        );
        if (activeThread) threadBody.scrollTop = activeThread.scrollHeight;
    }

    items.forEach(function (item) {
        item.addEventListener("click", function () {
            openConversation(item.dataset.conversation);
        });
    });

    if (backButton) {
        backButton.addEventListener("click", function () {
            if (messagesShell) messagesShell.classList.remove("is-thread-open");
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", function () {
            const query = searchInput.value.trim().toLowerCase();
            let visible = 0;

            items.forEach(function (item) {
                const name = item.dataset.name.toLowerCase();
                const preview = item.querySelector(".conversation-item-text p").textContent.toLowerCase();
                const show = !query || name.includes(query) || preview.includes(query);
                item.style.display = show ? "" : "none";
                if (show) visible += 1;
            });

            if (emptyState) emptyState.hidden = visible !== 0;
        });
    }

    if (composer) {
        composer.addEventListener("submit", function (event) {
            event.preventDefault();

            const text = input.value.trim();
            if (!text) return;

            const activeThread = threadBody.querySelector(".thread-conversation:not([hidden])");
            if (activeThread) {
                const msg = document.createElement("div");
                msg.className = "thread-msg sent";
                msg.innerHTML =
                    "<p></p><span class=\"thread-msg-time\">Just now</span>";
                msg.querySelector("p").textContent = text;
                activeThread.appendChild(msg);
                threadBody.scrollTop = threadBody.scrollHeight;
            }

            const activeItem = list.querySelector(".conversation-item.is-active .conversation-item-text p");
            if (activeItem) activeItem.textContent = text;

            input.value = "";
        });
    }

    // Open the first conversation by default on wide screens; on narrow
    // screens the list shows first until a conversation is tapped.
    if (window.matchMedia("(min-width: 851px)").matches) {
        openConversation("paystack");
    }

})();
