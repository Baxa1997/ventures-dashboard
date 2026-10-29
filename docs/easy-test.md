# Easy test: one deal from start to portfolio

About 30 minutes. You take one test deal through every stage, using only the panel.

- Open **https://admin.sqbvc.uz** and sign in as `Sqb-admin`. You are «Администратор», the director.
- The panel is in Russian only for now; button names below are as the screen shows them.
- Start every test name with **ZZ**, so it is easy to find and delete later.
- After each step, check the line starting with **✓**. If you see something else, take a screenshot and write down the step number.

For the full, detailed test see [test-cycle.md](test-cycle.md).

---

## 1. Add committee members (only the first time)

1. Left menu → **Инвесткомитет** → **«Назначить заседание»**. Under **«Участники»** click **«Добавить человека»**.
2. Кто «Не из команды фонда», Name `ZZ Член 1`, Роль «председатель ИК» → **«Добавить»**.
3. Add two more the same way: `ZZ Член 2` and `ZZ Член 3`, Роль «независимый член». Close the window without scheduling.

✓ Next time «Назначить заседание» lists the three under «Участники», ticked.

## 2. Create a deal

1. Left menu → **Сделки** → **«Новая сделка»**.
2. Fill in: Компания `ZZ Test Startup`, Чем занимается `Тест`, Отрасль — choose **FinTech**, Запрос `150000`. Источник, Стадия раунда and Страна are already chosen (Нетворк, Seed, Узбекистан). Click **«Добавить»**.

✓ The deal is in Сделки with the stage **«Входящие»**, and its card's **«Проверка мандата»** says **«Соответствует»**.

## 3. Take it into screening

1. Open the deal → **«Взять в скрининг»**.

✓ The stage is **Скрининг** and you are the owner. The **«Следующий шаг»** card says what to do.

## 4. Screening

1. Open the tab **«Скрининг и оценка»**.
2. For each of the 7 criteria, click a score (1–5) and write any reason under it.
3. **«Второй оценщик»** → choose `Bahrom`.
4. Click **«Завершить скрининг»** (top right).

✓ The stage is **Встреча**.

## 5. Meeting and analysis

1. Click **«Перевести в «Анализ»»** → **«Перевести»**.
2. Click **«Перевести в «ИК-1»»** → **«Перевести»**.

✓ The stage is **ИК-1**. «Следующий шаг» shows **«Вынести на заседание»**.

## 6. ИК-1 meeting

1. In «Следующий шаг», click **«Вынести на заседание»**.
2. The window already has Тип **ИК-1** and `ZZ Test Startup` ticked. Pick today's date or later → **«Назначить»**.
3. On the meeting page, under **«Отметить, кто из них будет»**, set all three members to **«Будет»**.
4. Click **«Открыть заседание»** (top right).
5. In **«Голосование»**, set all three votes to **«За»**.
6. Click **«Зафиксировать одобрение»**, then **«Сформировать протокол»**.
7. Click **«Отметить протокол подписанным»**, paste `https://example.com/zz` → **«Сохранить»**.

✓ The meeting shows «Проведено · протокол подписан», and «Открыть подписанный протокол» is there.

## 7. Detailed DD

1. Back on the deal (the agenda has a «Карточка сделки» link) → **«Перевести в «Детальный DD»»**.

✓ The window says «выполнено 1 из 1» and **«Перевести»** is on. Click it.

2. Click **«Перевести в «ИК-2»»** → **«Перевести»**.

## 8. ИК-2 meeting and the director's approval

1. Do step 6 again. The window now has Тип **ИК-2**.
2. On the deal, click **«Перевести в «Набсовет»»**.

✓ The window lists two items: the ИК-2 approval (done) and **«Получить одобрение директора»** (not done).

3. Click **«Одобряю»**, then **«Перевести»**.

✓ The deal's **«История»** tab shows «Директор одобрил переход».

## 9. Supervisory board, closing, portfolio

1. Do step 6 again. The window now has Орган **«Наблюдательный совет»**.
2. On the deal: **«Перевести в «Закрытие»»** → **«Перевести»**.
3. Then **«Перевести в портфель»**: the window asks for the fund's investment. Keep SAFE, the amount and today's date → **«Перевести в портфель»**.

✓ The deal's status is «Портфель», and «Следующий шаг» says «Сделка закрыта — компания в портфеле» with a link to the company.
✓ **Портфель** lists the company with the amount invested.

## 10. Quick checks

- **Инвесткомитет**, each meeting's tab **«Решения»**: the decisions for `ZZ Test Startup`.
- **The deal → «Решения ИК и НС»**: the same three.
- **Настройки**: the menu on the left has Типы задач, Статусы задач, Этапы сделки, Отрасли, Раунды, Источники, Регионы, Причины отказа, Мандат and more. «Мандат» → «Из справочников» shows Pre-seed and Seed and the five Central Asian countries as the mandate.

## 11. Optional: a rejection

1. **Сделки** → **«Новая сделка»** → `ZZ Reject Startup` → **«Добавить»**.
2. Open it → **«Отказать с причиной»** → pick a Причина → **«Отказать»**.

✓ Its stage is **«Отказ»**: it shows in Сделки with the stage filter set to «Отказ» or «Все этапы».

---

## Good to know

- Applications sent on the live website (sqbvc.uz) do not reach the panel yet: the site still uses another ucode project. That is why deals for testing are created with «Новая сделка».
- The board meeting uses the same members as the investment committee for now.
- The panel deletes a meeting only before it opens («Удалить» on its page), and no deals. When you finish, take members off the committee with «Убрать» → «Из состава ИК» on a planned meeting's «Участники» (or «Убрать» next to a person in «Назначить заседание»), and ask the developer to delete the `ZZ` meetings and deals.

## Reporting a problem

Write down:
- the step number;
- what you clicked;
- what you expected;
- what you saw, with a screenshot.
