# Forsaken Fortune Teller – Messenger webhook bot

Zero-dependency Node.js (>=18) bot for the Facebook Page **Forsaken Fortune Teller**. Users message the Page with their name, star sign and a question and get back a short, playful fortune (2–4 sentences). It's for entertainment only.

- It uses only the text of the message. It never calls the Graph API for profile data, and it takes no payments.
- If `XAI_API_KEY` is set it uses xAI. Otherwise, if `OPENAI_API_KEY` is set, it uses OpenAI. Either one gets a system prompt. With no key it falls back to a local template generator.
- A greeting is built from the time of day in Australia/Brisbane, the weekday, the southern-hemisphere season, and the current moon phase. It weaves in any name or star sign the visitor already typed, and asks only for what is still missing. Readings stay free.
- The greeting includes a button, **Start a video reading 🔮**. Saying "video", "call", or "video call" opens the same free video reading. The bot creates a Jitsi Meet room and sends a **Join the video reading** link. The fortune teller joins there shortly.

## Config (`.env`)
| var | purpose |
|---|---|
| VERIFY_TOKEN | token you enter in the Meta webhook settings |
| PAGE_ACCESS_TOKEN | Page token used for the Send API (`graph.facebook.com/v21.0/me/messages`). If it's blank, replies are only written to server.log |
| APP_SECRET | optional. Turns on the `X-Hub-Signature-256` check |
| XAI_API_KEY / OPENAI_API_KEY | optional LLM keys (`XAI_MODEL` / `OPENAI_MODEL` override the model) |
| PORT | default 3000 |

Open `GET /calls?key=<VERIFY_TOKEN>` to see the newest video requests (up to 50): time, the name they typed, and the room link. A wrong or missing key returns 403. Messenger ids are not listed.

## Run
    ./restart.sh          # starts node + cloudflared quick tunnel, prints URL
    tail -f server.log tunnel.log

## Meta setup
1. In your Meta app, open Messenger → Webhooks. Set the callback to `https://<public-url>/webhook` and the verify token to the value of `VERIFY_TOKEN`. Subscribe to `messages` (and `messaging_postbacks` if you want it).
2. Generate a Page access token for the Page, put it in `.env`, then run `./restart.sh`.

## Limitations
- A quick tunnel's URL changes every time it restarts, so you have to update the callback in Meta each time. For a stable URL, use a named Cloudflare tunnel or a real host.
- The name, star sign, and current question are kept in memory only, so they reset on restart. After a fortune, the question is cleared so the visitor can ask another.
- Nothing is read from the Graph API beyond sending the reply. Profile fields are never requested.
- Pending video rooms are kept in memory only, and the list is cleared on restart.
