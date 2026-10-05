---
name: tier-facts
description: Rank any list into an S/A/B/C/D tier list on facts, not vibes. Looks up facts for each item first, lets the user's own facts and reasoning override anything looked up, and labels every placement as from the user, looked up, or guessed. Use whenever the user types /tier-facts, asks for a tier list or ranking that should be accurate, researched, sourced or "for real", supplies their own facts or opinions alongside a list to rank, or wants to check or challenge a ranking the model gave from memory. Prefer this over tier whenever the decision matters (buying, choosing, recommending) or the items are recent.
---

# /tier-facts — the ranking with evidence

Turn a list into a tier list where every placement rests on something you can point to. The
companion skill `tier` ranks from memory; this one ranks from facts, and is honest about where each
fact came from.

The idea behind it: a model is only as good as the state you hand it. Given bare names it recalls
reputation. Given the facts, the same model corrects itself. So the real work of this skill is
assembling the facts, and the ranking is the easy last step.

## Input

```
/tier-facts <items> [for <criteria>]

<item>: <the user's own fact or reasoning>
<item>: <another>
<a general line of reasoning, e.g. "I shoot handheld at night, so stabilisation matters most">
```

- Items and criteria work as in `tier`: comma or newline separated items, criteria after " for ",
  optional weights like `x2`. No criterion: ask once, or rank on overall quality if they don't mind.
- Lines of the form `item: text` are the user's facts about that item.
- A line that names no item is the user's reasoning about what matters. Treat it as steering the
  criteria and their weights, and say in the output how you applied it.
- Everything the user supplies is optional. With none, the skill simply looks everything up.

## Where facts come from, in priority order

1. **The user's word.** If the user states something about an item, that stands, even when a
   lookup disagrees. They may own the thing, know the field, or know that the public record is
   stale. This covers opinions and experience as well as facts: "we play it every week and it is
   brilliant with two" is first-hand evidence about that item on that criterion, and it is their
   ranking. When a lookup contradicts them, keep their word, and mention the disagreement in one
   line under the board so they can decide. Do not silently "correct" them. Their word places
   their item; it does not by itself push other items down, which are still judged on their own
   evidence.
2. **Looked up.** For every item the user did not fully cover, find facts relevant to the criteria
   using whatever search or browsing tools are available. Pick the source that suits the
   criterion: the maker's own page for specifications, hands-on reviews and community consensus
   for how something performs or feels. Open the page before relying on it; a search-result
   snippet is a lead, not a source. Look for the facts that decide the criterion, not a generic
   summary: for "video", that means stabilisation, audio inputs, rolling shutter and codecs, not
   megapixels.
3. **Guessed.** If nothing can be found and the user said nothing, place the item on what you
   already know and mark it as a guess. A guess is allowed. An unlabelled guess is not.

Two traps worth knowing about:
- **Wrong model.** Search results and reference pages often describe a predecessor or a whole
  product series. Check that the facts are about the exact item, including its model number or
  generation. A fact about the wrong model is worse than no fact.
- **Spec-sheet facts.** "8K video" is true and useless if the camera has no microphone input and
  severe rolling shutter. Prefer facts about how the thing performs on the criterion over headline
  numbers.

**Pick up a picture while you are there.** When you open a page for an item, note the address of
its main product image (the page's `og:image`, or the main product photo), so the board can show
it. Take it only from a page about the exact item: a picture of the previous model or of the whole
range is as misleading as a wrong fact, so when in doubt leave it out. Makers' own product shots on
a plain background work best. Do not go searching separately for pictures; an item with no picture
simply gets a name-only tile.

If no lookup tools are available at all, say so plainly at the top, use the user's facts where
given, and mark everything else as guessed. Do not pretend to have looked.

## How to rank

Same rules as `tier`, because they are what make it a tier list:

1. Rank relative to this list only.
2. Five tiers, best first: S, A, B, C, D (or the user's own labels).
3. The best item of the list is always in S. Nothing is forced into D.
4. With several criteria, judge each separately on the facts, then blend by weight.

And one that only applies here:

5. **Rank on the facts in front of you, not on reputation.** If the facts say the famous item is
   poor on this criterion, it goes low. That reversal is the value of the skill.

## Output

```
<Category>, ranked for <criteria>

S  <item>        <you said | looked up | guessed>: <the deciding fact, short>
A  <item>        <...>
B
C  <item>        <...>
D  <item>        <...>
   <item>        <...>

Changed from names only: <item> <tier> → <tier>, <item> <tier> → <tier>
Based on: <n> from you, <n> looked up, <n> guessed
Sources: <one link per looked-up item>
```

- Title: list the criteria in plain words, with any weight in brackets, e.g.
  `ranked for range, value for money (×2)`.
- When an item comes in several variants, look up and rank the current standard one, and say which
  in the evidence (`looked up: Long Range, 629 km`). The user can name a variant to override.
- One item per line here (unlike `tier`), because each carries its evidence. Align the evidence
  column. Items sharing a tier are listed under it, strongest first.
- The evidence label is exactly one of `you said`, `looked up`, `guessed`, followed by the single
  fact that most decided the placement, in a few words. Not a list of specs. When an item rests on
  both the user's word and a lookup, label it by whichever decided the placement; if they agree,
  the user's word takes the label.
- **Changed from names only**: before looking anything up, note privately where you would have
  placed each item from memory. After ranking on facts, list the items that moved a tier or more,
  biggest move first. If nothing moved, write `Changed from names only: nothing moved.` This line
  is what shows the user whether the facts mattered, so do not skip it and do not invent movement.
- **Sources** lists one link per looked-up item, and only pages you actually opened. If a fact
  rests on a search snippet you could not open, write `(search summary)` after the link so the
  user knows how firm it is.
- **Based on** counts items by their evidence label. If any are guessed, the user should see that
  number is not zero.
- If the user's reasoning line changed the weights, add one line: `Your reasoning applied:
  <what you did>`.
- If a lookup contradicted a user fact, add one line: `Note: <source> says <x> about <item>; kept
  what you said.`
- Keep everything else out. No preamble, no per-item paragraphs, no closing summary.

## The picture

A tier list is a picture, so after printing the text board, draw it. The bundled script writes a PNG
by default and needs nothing installed:

```bash
node <this skill's folder>/scripts/board.mjs board.json --out tier-list.png
```

Write `board.json` to the system temp folder first (do not leave it in the user's project). Each item
carries its evidence as a `note`, drawn under the name, and optionally an `image` address, drawn
above it:

```json
{ "title": "Compact cameras, ranked for video",
  "tiers": [ { "label": "S", "items": [ { "name": "Lumix S9", "note": "you said: V-Log, open gate, stabilised" } ] },
             { "label": "A", "items": [ { "name": "Canon G7 X III", "note": "looked up: 4K, mic input, flip screen",
                                          "image": "https://<maker's site>/<product-shot>.png" } ] },
             { "label": "B", "items": [] },
             { "label": "C", "items": [ { "name": "Fujifilm X100VI", "note": "looked up: 6.2K but fixed 35mm lens" } ] },
             { "label": "D", "items": [ { "name": "Ricoh GR IV", "note": "looked up: Full HD only" },
                                        { "name": "Sony RX1R III", "note": "looked up: no in-body stabilisation" },
                                        { "name": "Leica Q3", "note": "you said: rolling shutter, no mic input" } ] } ],
  "footer": "Changed from names only: Leica Q3 S → D, Lumix S9 A → S.  Based on: 2 from you, 4 looked up, 0 guessed." }
```

- Include every tier, empty ones too. Keep each note to the same short text as the text board.
- Add `image` for each item you found a picture for. The script downloads those pictures and embeds
  them in the file, so the image works anywhere it is shared; one that fails to download is skipped
  and that tile shows the name only. It reports `pictures: n of m embedded`; no need to pass that on
  unless none worked. Add `--no-images` if the user does not want pictures or is offline.
- The footer is the "Changed from names only" and "Based on" lines. Leave the sources out of the
  image; they stay in the text.
- Save the image in the current working directory with a short name that says what it is, e.g.
  `tier-facts-compact-cameras.png`. Add `"theme": "light"` if the user asks for a light board.
- The script prints the full path it wrote as its last line. Report it as the very last line of
  your reply, as a path relative to the working directory when it is inside it: `Image: tier-facts-compact-cameras.png`.
- The script adds a small `ultratier.github.io` mark in the corner. That is intended.
- If no PNG renderer is available the script writes an SVG instead and says so; pass that message
  on. Use `--svg` when the user asks for an SVG.
- Skip the image when the user says they only want text, or when there is no shell to run it in.
  The text board is always shown either way.

## Example

Input:

```
/tier-facts Ricoh GR IV, Fujifilm X100VI, Lumix S9, Sony RX1R III, Canon G7 X III, Leica Q3 for video

Leica Q3: 8K on paper but heavy rolling shutter and no mic input
Lumix S9: V-Log, open gate, stabilised
```

Output:

```
Compact cameras, ranked for video

S  Lumix S9            you said: V-Log, open gate, stabilised
A  Canon G7 X III      looked up: 4K, mic input, flip screen
B
C  Fujifilm X100VI     looked up: 6.2K but fixed 35mm lens
D  Ricoh GR IV         looked up: Full HD only
   Sony RX1R III       looked up: no in-body stabilisation
   Leica Q3            you said: rolling shutter, no mic input

Changed from names only: Leica Q3 S → D, Lumix S9 A → S
Based on: 2 from you, 4 looked up, 0 guessed
Sources: <links for the four looked-up cameras>
```

## When the user disagrees with the result

They can reply with more `item: fact` lines or a line of reasoning. Re-rank with those added,
their word still winning, and show the board again with an updated "Based on" line. The loop is
the feature: agree with it, or fight it with facts.
