# События Яндекс.Метрики

## Экраны

- `hit` — просмотр экрана SPA: `home`, `setup`, `exercise`, `result`.

## События

- `training_setup_open` — открыта форма создания тренировки.
- `theme_select` — тема выбрана или снята.
- `difficulty_change` — изменена сложность тренировки.
- `training_size_change` — изменено количество заданий.
- `training_start` — тренировка успешно начата.
- `answer_reveal` — показан правильный ответ.
- `exercise_result` — задание отмечено как пройденное или требующее повторения.
- `training_complete` — тренировка завершена.
- `training_resume` — продолжена незавершённая тренировка.
- `training_exit` — пользователь вышел из активной тренировки.
- `training_setup_abandon` — форма тренировки закрыта без запуска.
- `theme_toggle` — переключена светлая или тёмная тема сайта.

## Воронка тренировки

`training_setup_open` → `training_start` → `training_complete`

Падение между этапами показывает, где пользователи прекращают путь. `training_setup_abandon` уточняет закрытие формы без запуска.
