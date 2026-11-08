# Сбор новостей: the website's news from the fund's sources

The fund lists its sources in **Настройки → Сбор новостей**. The bot's server (`venture/telegram-bot`, `src/news`) checks them on a schedule and leaves each article that fits as a draft in **Сайт → Новости**. Someone publishes it with one click, or rejects it. On sqbvc.uz a collected article is a card with the title, a short lead, the outlet's picture and a link that opens the original. The tables are batch 28 of [ucode-migration.md](ucode-migration.md).

## Decisions (8 Nov 2026)

- **Both kinds of news.**
  - An article that names the fund goes to «Пресса о нас» (`Press`), even up to a year old.
  - Other articles go to the new «Рынок» (`Market`) if they are no older than a week and match a source's keywords.
- **Drafts.** Found articles wait for someone to publish them. A source switched to «Публиковать сразу» puts its articles on the site at once.
- **Title, summary and link only.** The article's text was not copied, since that needs the outlet's permission. The picture is the outlet's own (`og:image` or the feed's), shown from the outlet's address.
- **Changed later on 8 Nov: the full text.** The user asked for each article's text and pictures in «Текст новости», and said the fund has the outlets' permission. The collector now puts them there (see «Writing a news by hand»).
- **Keywords now, Claude when there is a key.**
  - Without `ANTHROPIC_API_KEY` on the server, articles are picked by keywords and the fund's names. The title and lead stay in the article's language, and the website shows them in every language.
  - With the key, Claude reads each candidate, keeps only those that fit the fund's focus (Настройки → Сбор новостей → «Фокус фонда»), and writes the title and a 2–3 sentence summary in Russian, Uzbek and English.
  - Nothing in the panel changes when the key is added.

## Sources

| Type | Address | How it is read |
|---|---|---|
| RSS-лента | the feed's address | RSS, RDF or Atom (`fast-xml-parser`) |
| Сайт | the site or a section of it | its `<link rel="alternate">` feed, else `/rss`, `/feed`, `/rss.xml`… |
| Telegram-канал | `@name` or `t.me/name` | the public preview `t.me/s/name`; no account, no bot. A post that links to an article counts as that article |
| Поиск Google News | search words (`"SQB Ventures"`, `стартап Узбекистан when:7d`) | `news.google.com/rss/search`, edition UZ:ru; the outlet from `<source>`. The link opens the article through Google, so its page is not read: no picture and no lead without Claude |

«Добавить рекомендуемые» adds five sources (changed later on 8 Nov, so articles come with their text and pictures):
- Spot.uz, Gazeta.uz, Kun.uz and UzDaily, through their own feeds, with startup keywords;
- Google News «"SQB Ventures"», for mentions only.

A Google News search finds articles but gives only a title and a link. Finding them again in their outlets' own feeds by title was tried on 8 Nov: 1 in 15 matched, because those feeds keep only the last 10–40 articles. It was dropped.

## How a round goes (`src/news/index.ts`)

1. **Which sources are due.** Every minute the server writes `fund_settings.news_seen_at` and works out which sources are due. A source is due when:
   - it is switched on, and
   - it has never been checked, or `checked_at` is older than `news_every` minutes (30), or «Проверить сейчас» was pressed (`news_requested_at` newer than `news_checked_at`).

   «Проверить» on one source empties its `checked_at`.
2. **New articles.** It looks at a source's 30 newest articles. An article whose guid (UUID v5 of its address without query) is in the source's `seen`, or that is already a `news` row, is skipped. So is one with the same title as a kept news. This also catches Spot's channel and Spot's feed bringing the same article twice.
3. **The article's page.** The server reads it for the picture, the description and the text. The text is used to find the fund's names, and is sent to Claude.
4. **The decision.**
   - The fund named (`news_names`, word-start match): `Press`.
   - Else, if the source is not mentions-only, the article is within a week, and its title or lead starts a word with one of the source's keywords (or the source has none): `Market`.
   - With Claude: only those candidates go to Claude, at most 40 per round, and it may still say «not relevant».
5. **The draft.** A kept article becomes a `news` row: `origin` collected, `is_published` = the source's `auto_publish`, `note` (why), `source_id`, `found_at`. The source gets `checked_at`, `found_count`, `error` and `seen` (the last 500 guids). A rejected or deleted news therefore never comes back.

**Claude** (`src/news/ai.ts`):
- The request uses the official SDK `@anthropic-ai/sdk`, with `claude-opus-5-5` by default (`ANTHROPIC_MODEL` changes it), effort `low`, and a JSON-schema answer `{relevant, section, reason, title{ru,uz,en}, summary{ru,uz,en}}`.
- If Claude's safety classifiers decline, the request is retried server-side on the model Anthropic recommends (`fallbacks: "default"`). A decline that stays is treated as «not relevant».
- A wrong key falls back to keywords for the round, and the panel shows `news_error`.
- When Anthropic asks to wait, the rest of the articles stay for the next round.
- The article text is wrapped as data, and the prompt says never to follow instructions in it.

## In the panel

- **Настройки → Сбор новостей** (`src/modules/Site/pages/components/NewsCollector.tsx`, `services/collector.ts`) has two sections, simplified at the user's word on 8 Nov:
  - **«Новости для сайта»:**
    - its badges: whether the server runs, Claude or «По ключевым словам», and when it last checked;
    - its actions: how often each source is checked (a select), «Отбор» (a window with the fund's names and its focus for Claude), and «Проверить сейчас»;
    - inside it, the sources, with their type, picking, found count, last check or error, «Сразу на сайт» and «Включён», «Проверить», edit and delete.
  - **«Найденные новости»:**
    - the collected news as the site's cards (`NewsCard.tsx`, shared with Сайт → Новости), with a switch: «Ждут проверки», «На сайте» and «Отклонены»;
    - each card is published, rejected, opened or deleted there;
    - 12 at most, then a link to Сайт → Новости.

  Only the director (Настройки in full) edits the sources; publishing needs the right to Сайт.
- **Сайт → Новости** (`News.tsx`):
  - The «Статус» filter gets «Найдено сборщиком» and «Отклонённые», and the menu counts the waiting ones.
  - A collected row shows «Найдено», the outlet with a link to the original, and why it was taken.
  - «Отклонить» (`is_rejected`, which also takes it off the site) and «Вернуть».
  - The category «Рынок» edits the outlet and the link, as «Пресса о нас» does.

## The list

Сайт → Новости (`/site/news`, `News.tsx`) shows the news as **cards** (the default) or as a **table**. The switch sits beside «На сайте», and the choice is kept with the person (`prefs`, key `site.news.view`).

- **A card** shows:
  - the cover, or the section's icon as the site draws it, with the state badge (Опубликована, Черновик, Найдено or Отклонена);
  - the date and the section, plus the outlet for «Рынок» and «Пресса о нас»;
  - the title, the lead, and why a collected item was taken;
  - the on-site switch, the languages filled, the link to the original, «Отклонить», and edit and delete.
- **The table** has the same columns as before.
- **Search, «Рубрика» and «Статус»** filter both views.

## Writing a news by hand

Сайт → Новости → «Новая новость», or a news item's title, opens its own page, `/site/news/new` or `/site/news/:id` (`src/modules/Site/pages/NewsEditor.tsx`). The pop-up window it replaces is gone.

- **The text.** Russian, Uzbek and English tabs hold the title, the lead and the text. The text uses CKEditor in its article mode (`RichTextEditor` with `article`), which offers:
  - headings H2 and H3, bold, italic, underline and links;
  - lists, quotes, a line and tables;
  - pictures, pasted, dropped or picked. Each is stored in ucode Files at once (folder of the website's files, up to 5 MB) and the text keeps its address.
  - video by a YouTube or Vimeo link, with the player written into the HTML (`mediaEmbed.previewsInData`).
- **How it is kept.** The text stays HTML in `body_ru`, `body_uz` and `body_en` (decided 8 Nov).
  - A JSON field would gain nothing, because ucode keeps JSON as text.
  - It would also need another editor, a renderer on the site and converting the news already written.
- **«Предпросмотр».** It shows the article as the site's article page does: the cover, the section and date, the title, the lead and the text. It falls back to another language where this one is empty. The text is sanitized with DOMPurify, letting through only YouTube and Vimeo frames (`ArticleText`).
- **«Текст из источника».** A collected news item's page shows the article as the outlet wrote it: its text, headings, lists, quotes and pictures, with the page's main picture first.
  - The server reads it from the article's page (`src/news/extract.ts`: the `itemprop="articleBody"` element, the usual class names, or `<article>`), from a feed that carries the whole article, or from the Telegram post.
  - It is stored in `news.original`, which the site never shows.
  - «Вставить в текст (RU)» copies it into the news item's text in that language, asking first if there is text already. The page opens on the article's own language.
  - A Google News link opens the article only in a browser, so its text cannot be read. The server was refused (8 Nov) decoding Google's links, and that is not to be retried: for full text, use the outlets' own feeds or Telegram channels.
  - Articles collected before 8 Nov got their text afterwards, a few per minute.
- **The side panel.** «Публикация» holds the date, the section, the outlet and link (for «Рынок» and «Пресса о нас»), the cover, the address on the site (`slug`, made from the title when empty), and «Открыть на сайте». A collected news item also shows where it was found and why, with «Отклонить» or «Вернуть».
- **Buttons.**
  - A draft has «Сохранить черновик» and «Опубликовать»; a published item has «Снять с сайта» and «Сохранить».
  - «Удалить новость» asks first.
  - Leaving with unsaved changes asks first: «Все новости» on the page, or closing the tab.

On the website, `.prose` styles the editor's blocks: quotes, pictures with captions, video, tables and the line.

## On the website

Redesigned on 8 Nov at the user's word, after Crunchbase's news pages and a blog the user showed (`sqb-ventures-website/src/modules/Insights`).

- **The list** (Аналитика: Content Hub and Newsroom) is `NewsBrowser.tsx`, the only client part:
  - a search box and the sections with their counts;
  - the newest news item as the lead story (cover, section or outlet, reading time, title, lead, date), with the next three beside it as rows (square thumbnail, section, reading time, title);
  - all the rest as cards, nine at a time with «Показать ещё».

  A search or a section shows only the matching cards. Every text is prepared on the server in the page's language (`helpers.ts`, `toItem`).
- **Where a card leads.** A news item with a text of its own opens its page on the site, «Рынок» and «Пресса о нас» too. One without text («Рынок» or «Пресса о нас» from Google News) opens the outlet's page, marked with an arrow.
- **The article page** (`ArticlePage.tsx`):
  - **On the page ground:** «← Все новости / раздел», the section or outlet, the title, the lead, the date and reading time, «Поделиться в Telegram», and the cover beside it.
  - **Then the text,** at a reading size.
  - **Beside it:** «В этой статье» (the text's H2 and H3, given anchors, shown when there are at least two), the outlet's card for a collected news item, and a Pitch Us card. On narrow screens these go under the text.
  - **Last:** «Ещё новости», three cards.
- **Languages.** `Market` is a section («Рынок» / «Bozor»), with its own cover. `pick` falls back to any language the news item has, so a news item in Russian only shows on /uz and /en too.
