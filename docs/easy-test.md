# Easy test: one deal from start to portfolio

About 30 minutes. You take one test deal through every stage, using only the panel.

- Open **https://admin.sqbvc.uz** and sign in as `Sqb-admin`. You are «Администратор», the director.
- Keep the panel in Russian. The language switch is in the user menu, bottom left.
- Start every test name with **ZZ**, so it is easy to find and delete later.
- After each step, check the line starting with **✓**. If you see something else, take a screenshot and write down the step number.

For the full, detailed test see [test-cycle.md](test-cycle.md).

---

## 1. Add committee members (only the first time)

1. Left menu → **Инвесткомитет** → tab **«Состав и договоры»**.
2. Click **«Добавить члена ИК»**. Name `ZZ Член 1`, Роль «председатель ИК» → **«Добавить»**.
3. Add two more the same way: `ZZ Член 2` and `ZZ Член 3`, Роль «независимый член».

✓ Three members are listed, the chair first.

## 2. Create a deal

1. Left menu → **Сделки** → **«Новая сделка»**.
2. Fill in: Компания `ZZ Test Startup`, Чем занимается `Тест`, Отрасль `FinTech`, Запрос `150000`. Click **«Добавить»**.

✓ The deal is in the **«Входящие»** tab.

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
3. Then **«Перевести в портфель»** → **«Перевести»**.

✓ The deal's status is «Портфель».

## 10. Quick checks

- **Инвесткомитет → «Реестр решений»**: three decisions for `ZZ Test Startup`.
- **The deal → «Решения ИК и НС»**: the same three.
- **User menu → Язык → O‘zbek**: the pages read in Uzbek. Switch back to Русский.

## 11. Optional: a rejection

1. **Сделки** → **«Новая сделка»** → `ZZ Reject Startup` → **«Добавить»**.
2. Open it → **«Отказать с причиной»** → pick a Причина → **«Отказать»**.

✓ It moves to the **«Отказы и пауза»** tab.

---

## Good to know

- Applications sent on the live website (sqbvc.uz) do not reach the panel yet: the site still uses another ucode project. That is why deals for testing are created with «Новая сделка».
- The board meeting uses the same members as the investment committee for now.
- The panel cannot delete meetings or deals. When you finish, take members off with «Вывести из состава», and ask the developer to delete the `ZZ` meetings and deals.

## Reporting a problem

Write down:
- the step number;
- what you clicked;
- what you expected;
- what you saw, with a screenshot.
