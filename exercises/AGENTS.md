# Exercise Bank Rules

These rules apply to every JSON exercise file in this directory.

## Source Material

- Use `/workspace/kartuli/exercises/teached.txt` as the primary local curriculum record.
- `teached.txt` contains the material already taught to the learner: vocabulary, grammar rules, example phrases, homework-style drills, and informal notes from lessons. It is not limited to exact example sentences; you may recombine learned words and learned grammar into new phrases.
- The official Georgian A1 notebook may be used as an external reference/source for examples and verification:
  - https://www.geofl.ge/lego/book.php?menu=menu&book=1&text=A1%20%E1%83%93%E1%83%9D%E1%83%9C%E1%83%98%E1%83%A1%20%E1%83%A1%E1%83%90%E1%83%A1%E1%83%AC%E1%83%90%E1%83%95%E1%83%9A%E1%83%9D%20%E1%83%A0%E1%83%94%E1%83%A1%E1%83%A3%E1%83%A0%E1%83%A1%E1%83%94%E1%83%91%E1%83%98&parent=2/
- When possible, verify generated Georgian forms against the official notebook examples or grammar guide. If the site content is not machine-readable, state the limitation and still apply the local `teached.txt` rules carefully.

## Difficulty Levels

Difficulty is pedagogical, not just sentence length.

- `difficulty: 1`
  - Use words and grammar that were certainly learned in `teached.txt`.
  - Keep phrases short and direct, usually 2-5 words.
  - Good examples: noun phrases, simple possession, simple location, short present/past/future forms, short learned transformations.
  - You may recombine known material, for example turning a learned pattern like "я работаю дома" into "сегодня я работаю в офисе сестры" only if it stays short and uses learned grammar.

- `difficulty: 2`
  - Use words and grammar from `teached.txt`, but make the task longer or grammatically richer.
  - Good level-2 material combines learned structures: possessives, genitive forms, postpositions, adjective changes, plural forms, time words, questions, movement verbs, "because/but/or/if" where taught.
  - Sentences may have more plot and context, but should not introduce genuinely new grammar.

- `difficulty: 3`
  - Grammar must still be strictly from `teached.txt`.
  - The sentence may include 1-2 new common real-life words, or words productively formed from learned words.
  - The base of the phrase should remain understandable through learned material; only the extra vocabulary should be new.

## Default Distribution

Keep the exercise bank near this default distribution unless the user explicitly asks for a different split:

- Level 1: 35%
- Level 2: 35%
- Level 3: 30%

Before changing exercise difficulties, adding a large batch, deleting exercises, or otherwise changing this distribution, ask the user for confirmation. If the user already gave an explicit target distribution in the current task, apply that target and report the final counts.

## Grammar Restrictions

- Do not introduce grammar that is absent from `teached.txt`.
- Do not use impersonal "need/want" style prompts such as "мне нужно", "ему нужно", "тебе хочется", or Georgian equivalents like `მჭირდება`, unless the user explicitly says this grammar has now been learned.
- Prefer explicit subject wording instead:
  - "я хочу"
  - "он хочет"
  - "ты хочешь"
  - "мы хотим"
- Avoid impersonal weather/state forms if they were not taught. Prefer explicit noun/adjective constructions when possible, for example "сегодня очень жаркий день" / `დღეს ძალიან ცხელი დღეა`.

## Exercise Variety

- Preserve and enrich both directions: `ru_to_ka` and `ka_to_ru`.
- Also use varied task modes when useful: `fill_blank`, `repair_error`, `dialogue_response`, `build_sentence`, and `choose_form`.
- Avoid filling the bank with repetitive two-word drills only. Level 1 can be short, but the full bank should include meaningful, contextual level-2 and level-3 practice.

## Data Contract

- Keep UUIDs stable once published.
- New exercises need globally unique UUIDs.
- Required fields: `id`, `task`, `answers`, `themes`, and `difficulty`.
- Preserve existing theme identifiers when possible.
- Validate JSON after edits and check for duplicate IDs.
