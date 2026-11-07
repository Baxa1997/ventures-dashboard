# Telegram groups for deals — research and plan

Every new deal opens its own Telegram group with the fund's bot in it. Every message in the group shows in the platform, and the team can write to the group from the platform.

Written on 7 November 2026, against the panel at `229a82f` and Telegram Bot API 10.3 (24 August 2026). Nothing here is built yet. Related docs:

- [cabinet-and-website.md](cabinet-and-website.md): the startup's people and the cabinet.
- [ucode-migration.md](ucode-migration.md): the tables; batch 26 below is a proposal.

**Decided on 7 November:**

- T1: anyone in the group adds anyone they want, and each message shows its author's name.
- T2: a new deal opens a new group by itself.
- T3: the fund's own Telegram account is wired in, and it opens each new deal's group by itself.
- T4: a rejected deal keeps its group as it is; what to do with it is decided later.
- Scope: only the deals' groups for now. No private chats and no mail.

**Built on 7 November** (uncommitted, in the panel's checkout on `editable-panel`, and in `venture/telegram-bot`):

- «Чат и письма» in the panel (Работа › Чат и письма, `/chat`), as the prototype draws it. Every deal has its group there, «Сделка: …»: the deal journal's `message` lines, the same chat as «Чат команды» on the deal's card, with files in `attachments` (section `chat`).
- Batch 26 in the test project.
- The bot server `venture/telegram-bot` (its README), run locally with the test bot `@SQBVenturesTestBot` in link mode: the fund's account is not wired in yet.
- Настройки → Интеграции shows only Telegram, at the user's word: three parts (the bot, with how to register it; the fund's account, with «Подключить аккаунт фонда» — a QR code the fund's phone scans in Telegram → Devices → Link Desktop Device, then the two-step password if any, encrypted in the browser; our app's api_id and api_hash are the bot server's own settings — and «Отключить аккаунт»; the bot's server), «Группы сделок» (every deal with its group's state and its step, and «Открыть группы» for all deals in work without one) and «Как это работает».
- In the panel: a bar under each group's head (where its Telegram group stands, «Подключить группу» / «Открыть в Telegram» / «Подключить заново»), Telegram authors and the delivery marks on messages, Настройки → Интеграции on top with the Telegram card's live state, and the «Новая сделка» note.

**What exists today:**

- «Чат команды» on a deal's and a company's card: its messages are `deal_events` rows with `kind` `message`, read again every 15 s (`src/modules/Deals/pages/Deal/components/DealChat.tsx`). «Чат и письма» shows the same messages as the deal's group.
- Настройки → Интеграции shows «Telegram-бот: Не подключено».

---

## 1. What Telegram allows

Checked on 7 November 2026 in the official docs (sources at the end).

| Question | Answer |
| --- | --- |
| Can a bot create a group? | **No.** No Bot API version up to 10.3 has a method that creates a group, a supergroup or a channel; the `create…` methods make invite links, forum topics, invoices and sticker sets. Only a user account can, over MTProto (`channels.createChannel` with `megagroup`). |
| Does a bot see every message? | Only as an admin of the group, or with privacy mode off (and then it must be added again). «Bot admins always receive all messages.» So the bot is always an admin. |
| Can a person add the bot in one tap? | Yes: `t.me/<bot>?startgroup=<param>&admin=<rights>`. The person picks one of their groups; the bot joins as an admin with those rights and receives `/start@<bot> <param>` there (`param`: up to 64 base64url characters). Creating a new group from that picker is not documented, and a bug report says the link fails in Telegram Desktop on macOS, so the card shows it as a QR code too, for a phone. |
| Invite links | `exportChatInviteLink` makes the group's main link, and a new one revokes the old. `createChatInviteLink` makes extra links, with a `name`, an `expire_date`, and either a `member_limit` or `creates_join_request`. |
| Who joins and leaves | With the bot an admin and `chat_member` in `allowed_updates`, every join and leave arrives as an update, with the person's name and the link they used. |
| Taking someone out | `banChatMember` keeps them out. `unbanChatMember`, without `only_if_banned`, removes a member and lets them come back through a link. |
| Name, photo, rules | `setChatTitle`, `setChatPhoto`, `setChatDescription`, `setChatPermissions`. |
| Files | A bot downloads at most 20 MB (`getFile`) and uploads at most 50 MB (20 MB when Telegram fetches the file from a URL). A local Bot API server lifts the download limit and allows uploads of up to 2000 MB. |
| Deleted messages | A bot gets **no update** when a message is deleted in a group; `deleted_business_messages` covers business chats only. The platform keeps a message that someone deleted in Telegram. Edits do arrive, as `edited_message`. |
| Sending limits | A bot can send at most 20 messages a minute in one group, and about one a second in any chat. |
| Changing ids | A basic group can become a supergroup, which changes its id; the update carries `migrate_to_chat_id`. |
| Receiving updates | `getUpdates` (long polling) needs no public address but can run in only one process, and does not work while a webhook is set. `setWebhook` needs public HTTPS and checks a `secret_token` sent as `X-Telegram-Bot-Api-Secret-Token`. |
| A user account driven by code | One account can be in at most 500 supergroups and channels (1000 with Premium). If the owner leaves a group, another member becomes its owner unless they return (`ChatOwnerLeft.new_owner`), so the fund's account must not leave old groups. «All accounts that log in using unofficial Telegram API clients are automatically put under observation», and flooding or spam means a ban «forever». No limit for creating groups is published, so groups are made one at a time from a slow queue, waiting out every `FLOOD_WAIT`. The API terms (1.4) forbid acting «on behalf of the user without the user's knowledge and consent», so the account is a dedicated account of the fund, never an employee's own. |
| New in 2026 | Managed bots (9.6) let a bot have people create bots it manages: a bot per deal would be possible but adds nothing. Communities (10.2) link supergroups and channels around one topic; bots can only read them. |

## 2. The design

### 2.1 The parts

```
 Panel (browser, staff token)                                Telegram
   writes requests: tg_actions, outgoing tg_messages            ▲  │ updates (getUpdates)
   reads tg_chats, tg_members, tg_messages                      │  ▼
        │                                   telegram-bot worker (Node): the bot (Bot API)
        ▼                                   + the fund's Telegram account (MTProto, §2.2)
 ─────────── ucode: the same project and tables ◄──────── project API key ─────────
        ▲
 Website: Pitch Us opens a deal (the worker notices it, §2.2)
```

- **A new worker, `venture/telegram-bot`** (Node 22 and TypeScript; grammY for the Bot API, GramJS for the fund's account). It reuses the cabinet's ucode client (`server/ucode/`).
- **No public address.** The worker receives Telegram's updates by long polling and reads the panel's requests from ucode. It therefore needs no ingress, DNS or Cloudflare entry, and nothing can call it from outside.
- **Exactly one replica**, since `getUpdates` runs in one process only.
- **The panel and the worker talk through ucode rows, like everything else in the platform.**
  - The panel writes a request: a `tg_actions` row, or a `tg_messages` row with `status` `pending`.
  - The worker carries it out and writes the result back.
  - So the panel needs no new key and no new sign-in, and every action is kept and retried.
  - The worker reads waiting rows every 2 s for five minutes after any activity, and every 10 s otherwise.
- **Why not in the cabinet's server:**
  - The worker holds the bot's token and the fund account's session, which is the whole of that Telegram account.
  - A crash in it should not take down the founders' cabinet.
  - It must stay at one replica.
- **Vault:** `secret/k8s/ucode-prod/sqb-telegram-bot`, holding `TELEGRAM_BOT_TOKEN`, `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `TELEGRAM_SESSION`, `UCODE_API_KEY` and `UCODE_PROJECT_ID`.
- **Deploy:** the same as the cabinet: CI builds `ghcr.io/ucode-io/sqb-telegram-bot`, then `Ucode-io/deployments` and ArgoCD roll it out, with no ingress.
- **The bot is made in BotFather from the fund's account**, so the token belongs to the fund rather than to a developer. The worker leaves any group it is added to that no deal asked for (`my_chat_member`, then `leaveChat`).

### 2.2 A new deal opens its group (T2)

**The worker notices new deals by itself.**

- Every 30 s it reads the newest `deals` and opens a group for each deal that has no `tg_chats` row.
- It counts only deals made after the day the feature is switched on, so older deals get no group unless someone presses «Создать группу».
- So both a deal from the website's Pitch Us and one entered by hand in «Новая сделка» get a group, and neither the website nor the panel changes for it.
- A setting in Настройки → Интеграции → Telegram can later narrow this to «при взятии в скрининг», if groups for unreviewed applications turn out to be too many.

**The only way a group opens with nobody's tap is the fund's own Telegram account** (T3):

- It is an ordinary Telegram account on a phone number the fund owns, an existing office number or a new SIM, with a two-step password.
- The developer signs it in once with the code Telegram sends to that number, and the worker keeps that sign-in in Vault.
- From then on the account creates the groups by itself and owns all of them, so the fund keeps every group whoever leaves the team.
- It is not a bot: Telegram does not let bots create groups (§1).

For each new deal:

1. The worker writes `tg_chats` with `status` `creating`.
2. The fund's account creates a supergroup, «Сделка: Bozorchi», with its description (`channels.createChannel` with `megagroup`). It then adds the bot and makes it an admin (`channels.editAdmin`).
3. The bot sets the deal's logo as the group's photo and makes the group's invite link (`exportChatInviteLink`). Members are allowed to add people (T1).
4. The bot writes a first message: what the group is for, and that the fund's platform keeps its messages.
5. The worker sets `tg_chats` to `active` with the link and writes «Группа в Telegram создана» to the deal's history.

**If the fund has no such account, or Telegram limits it:**

- The deal's card shows «Подключить группу»: a link and a QR code, `t.me/<bot>?startgroup=<one-time token>&admin=change_info+delete_messages+restrict_members+invite_users+pin_messages+manage_chat`.
- An employee creates an empty group in Telegram, opens the link and picks that group.
- The bot joins as an admin, renames the group and carries on from step 3. A token is used once and lasts 24 hours.
- This takes about half a minute of a person's time per deal.

Either way, a basic group that becomes a supergroup is followed by its new id (`migrate_to_chat_id`).

### 2.3 Who is in the group (T1)

- **Anyone in the group adds anyone they want**, in Telegram as usual, or through the group's link.
- The deal's card shows the link with «Скопировать» and a QR code, and «Новая ссылка» cancels the old one.
- The platform lists the members from Telegram's join and leave updates: name, @username, when they joined. «Удалить из группы» on a member asks first.
- The fund's account and the bot are always members.

### 2.4 Messages

- **From Telegram:**
  - Every message, edit and service event (joined, left, renamed) becomes a `tg_messages` row.
  - Each row keeps the author's Telegram name and @username: the name shown in the platform is the one in the group chat (T1).
  - Each row also keeps its kind (text, photo, document, voice, video, sticker, service), its text or caption, the message it replies to, and when it was sent and edited.
- **Files** are copied to ucode Files (folder `Telegram`), up to 20 MB. A bigger file is kept as a row with its name and size, and «Откройте в Telegram». Files there are public by link, as decided on 22 October.
- **From the panel:**
  - The person writes in the deal's Telegram window, which saves a `tg_messages` row (`out`, `pending`). The worker then sends it.
  - In the group it appears from the bot, signed: **Abdullo Khidoyatov · SQB Ventures**, then the text. A bot cannot write as a person.
  - Files are sent as uploads, up to 50 MB.
  - The row then gets the message's id and `sent`, or `failed` with the reason, and the window offers «Повторить».
- **In the platform:** «Чат и письма» (built) is where the messages show.
  - Each deal's group is one chat there, whether its lines were written in the panel or in Telegram. A group linked to Telegram gets the «T» mark and the «Telegram» filter.
  - The page reads new messages every 10 s, and the sidebar counts the groups with unread messages.
  - Messages sent from the panel are the sender's own, on the right; Telegram messages show their author's Telegram name.
- **One group per deal:**
  - Once the deal's Telegram group exists, what the team writes in the panel goes to it too, so whoever is in the Telegram group reads it. «Чат команды» on the deal's card then stops saying that only the fund's staff see the messages.
  - Messages written before the Telegram group existed stay in the platform only.
  - The panel's lines stay `deal_events` rows; the Telegram ones are kept as `tg_messages` (§3) and shown in the same group.
- **What a person deletes in Telegram stays in the platform**, since Telegram does not report it (§1).

### 2.5 Control from the panel

- **On the deal's card:**
  - The group's state (Создаётся, Ждёт бота, Активна, Потеряна, Ошибка), with «Открыть в Telegram».
  - The link, the members and «Удалить из группы».
  - «Создать группу» for a deal that has none, such as one made before the feature or one whose group failed.
- **In Настройки → Интеграции → Telegram** (director):
  - the bot and the fund's account, and whether each is connected;
  - every group with its deal, state, members and last message, and whether the bot is still an admin with its rights;
  - the account's count of groups against its limit.
- **The group follows the deal's name and logo** (`setChatTitle`, `setChatPhoto`).
- **A rejected deal keeps its group as it is** (T4). A deal that joins the portfolio keeps it too.
- **If the bot is removed in Telegram, or loses its rights,** the group shows as «Потеряна» on the card and in Интеграции.

## 3. Data — batch 26 (created on 7 November)

Smaller than first proposed: the messages are the deal journal's own lines rather than a table of their own, so «Чат и письма» and «Чат команды» show them without another read; members and the panel's requests need no table yet. As created (docs/ucode-migration.md, batch 26):

| Table / field | For |
| --- | --- |
| `tg_chats` (`title`, `chat_id`, `status`, `created_via`, `invite_link`, `link_token`, `link_expires_at`, `linked_at`, `requested_by_id`, `error`; relation to `deals`) | One row per deal's group. The panel asks for one with `status` `requested` |
| `deal_events.source`, `author`, `tg_message_id`, `tg_state` | A message from Telegram (`source` telegram, its author's Telegram name and its id); a panel message for the group (`tg_state` pending → sent / failed) |
| `fund_settings.telegram_bot`, `telegram_mode`, `telegram_seen_at`, `telegram_since` | The bot's state, written by its server every minute; deals made after `telegram_since` get a group by themselves |

Not built yet: the members' list from Telegram (`tg_members`), and removing a person from the panel.

## 4. Decisions

| # | Question | State |
| --- | --- | --- |
| T1 | Who is in the group | **Decided:** anyone in it adds anyone, names as in the group chat |
| T2 | When the group opens | **Decided:** at every new deal, website and «Новая сделка» alike; a setting can narrow it later |
| T3 | The fund's own Telegram account | **Decided:** the fund's account is wired in and opens the groups; the link stays as the way through when Telegram limits it |
| T4 | A rejected deal | **Decided:** the group stays as it is, for now |
| T5 | After the investment | The same group goes on (default) |
| T6 | The bot's name | Open, e.g. `@SQBVenturesBot`, made in BotFather from the fund's account |
| T7 | Confidentiality | Telegram groups are not end-to-end encrypted, and files copied to ucode are public by link. The data room stays the place for agreed documents |

## 5. Order of work, and how to check each step

| Step | Build | Check |
| --- | --- | --- |
| 1. The worker and the groups | Batch 26; the bot; the worker noticing new deals; the fund's account creating groups, or the link while there is none | A test application on Pitch Us and a deal by hand each open a group within a minute, named for the deal, with its logo, its link on the card and «Группа в Telegram создана» in its history. A group linked with an old token is refused, and the bot leaves |
| 2. Messages | §2.4 and the window on the card | Text, a photo, a 5 MB PDF and a 30 MB video sent in Telegram all show within 5 s with the author's name, the video as «Откройте в Telegram». A message and a PDF sent from the panel appear in the group, signed. An edit shows as edited |
| 3. Control | §2.5 | Someone added in Telegram appears among the members. «Удалить из группы» takes them out. «Новая ссылка» stops the old link. Renaming the deal renames the group. Removing the bot in Telegram shows «Потеряна» |

## 6. Risks

- **The fund's account can be limited or banned** if Telegram reads it as automation abuse. Groups are made one at a time, from a queue that waits out every `FLOOD_WAIT`; the link remains as the way through, and nothing after creation depends on the account.
- **It can be in at most 500 groups** (1000 with Premium), and every deal, rejected ones included, keeps its group (T4). It must not leave old groups, since another member would become their owner. Интеграции shows the count. Before it runs out, the fund takes Premium or adds a second account, which the worker takes in turn.
- **The account's session is the whole account.** It lives only in Vault, and the account has a two-step password.
- **Files over 20 MB** are not copied, unless a local Bot API server is added later.
- **Deletions in Telegram are not reflected** (§1).

## Sources

- Bot API reference: https://core.telegram.org/bots/api
- Bot API changelog (versions 8.2–10.3): https://core.telegram.org/bots/api-changelog
- Bot features (privacy mode, deep links): https://core.telegram.org/bots/features
- Bot FAQ (sending limits): https://core.telegram.org/bots/faq
- Deep links (`startgroup`, `admin`): https://core.telegram.org/api/links
- Client configuration (`channels_limit_default` 500, `channels_limit_premium` 1000): https://core.telegram.org/api/config
- `channels.createChannel` (errors incl. `CHANNELS_TOO_MUCH`): https://core.telegram.org/method/channels.createChannel
- API terms of service: https://core.telegram.org/api/terms
- Obtaining an api_id (monitoring, bans): https://core.telegram.org/api/obtaining_api_id
- `startgroup` bug in Telegram Desktop: https://bugs.telegram.org/c/47140
