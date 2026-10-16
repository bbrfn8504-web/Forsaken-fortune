# Forsaken Fortune Teller – Messenger webhook bot

Zero-dependency Node.js (>=18) bot for the Facebook Page **Forsaken Fortune Teller**. Users message the Page with their name, star sign and a question and get back a short, playful fortune (2–4 sentences). It's for entertainment only.

- It uses only the text of the message. It never calls the Graph API for profile data, and it takes no payments.
- If `XAI_API_KEY` is set it uses xAI. Otherwise, if `OPENAI_API_KEY` is set, it uses OpenAI. Either one gets a system prompt. With no key it falls back to a local template generator.
- A user's first message (or "hi", "help", or a postback) gets a greeting that explains how to ask for a reading.

## Config (`.env`)
| var | purpose |
|---|---|
| VERIFY_TOKEN | token you enter in the Meta webhook settings |
| PAGE_ACCESS_TOKEN | Page token used for the Send API (`graph.facebook.com/v21.0/me/messages`). If it's blank, replies are only written to server.log |
| APP_SECRET | optional. Turns on the `X-Hub-Signature-256` check |
| XAI_API_KEY / OPENAI_API_KEY | optional LLM keys (`XAI_MODEL` / `OPENAI_MODEL` override the model) |
| PORT | default 3000 |

## Run
    ./restart.sh          # starts node + cloudflared quick tunnel, prints URL
    tail -f server.log tunnel.log

## Meta setup
1. In your Meta app, open Messenger → Webhooks. Set the callback to `https://<public-url>/webhook` and the verify token to the value of `VERIFY_TOKEN`. Subscribe to `messages` (and `messaging_postbacks` if you want it).
2. Generate a Page access token for the Page, put it in `.env`, then run `./restart.sh`.

## Limitations
- A quick tunnel's URL changes every time it restarts, so you have to update the callback in Meta each time. For a stable URL, use a named Cloudflare tunnel or a real host.
- Which users have already been greeted is kept in memory only, so it resets on restart.
- Each event is handled on its own. There's no conversation memory.
