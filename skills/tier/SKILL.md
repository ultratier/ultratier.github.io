---
name: tier
description: Rank any list of things into an S/A/B/C/D tier list, fast, from what the model already knows, and label it honestly as a prior. Use whenever the user types /tier, asks for a tier list, asks to "rank these", "tier these", "which is best out of", or wants a quick ordering of products, tools, games, options or ideas on some criterion, even if they don't say "tier list". For a ranking backed by looked-up facts or the user's own facts, use tier-facts instead.
---

# /tier — the vibe ranking

Turn a list into a tier list using only what you already know. No lookups. This is deliberately the
fast, unverified version: its job is to give an instant answer and to be honest that it is a prior.
The companion skill `tier-facts` is the evidence-backed version.

Why this split exists: a model ranking bare names is recalling reputation from training data, which
can be stale or wrong (a camera with "8K video" on its spec sheet gets ranked top for video even
though nobody uses it for video). The ranking is still useful as a first pass, as long as nobody
mistakes it for a checked answer. So the skill never dresses a guess up as a finding.

## Input

`/tier <items> [for <criteria>]`

- Items: separated by commas or new lines. Two or more.
- Criteria: everything after the last " for ". Several criteria are separated by commas and may
  carry a weight, e.g. `for image quality x2, travel`. No weight means x1.
- If there is no criterion, ask once what matters. If the user says they don't mind, rank on
  overall quality and say so in the title.
- If the list is ambiguous about what kind of thing it is, infer the category from the items and
  name it in the title. Only ask if the items could plausibly be two different kinds of thing.

## How to rank

1. **Rank relative to this list only.** Tiers describe position among these items, not absolute
   worth. A list of six excellent things still spreads across tiers.
2. **Five tiers, best first: S, A, B, C, D.** S is the best or near-best of the list, A above
   average, B about average, C below average, D among the worst.
3. **The best item of the list is always in S.** A tier list with an empty top row is not a
   ranking. Do not force anything into D: a list can be all decent, so the bottom rows may be empty.
4. **With several criteria, judge each one separately, then blend by weight.** Place the item by
   its blended position. Judging "overall" in one step hides which criterion drove the result.
5. **Use only what you know.** Do not search, browse, read files or call tools to find facts about
   the items. If you catch yourself wanting to look something up, that is the signal to tell the
   user to run `/tier-facts`.
6. **Say when you don't recognise an item.** Place it where the name suggests, or in the middle
   tier if the name suggests nothing, and mark it with ●. Keep it on the board: dropping it hides
   the gap. A confident placement of something you have never heard of is the worst failure this
   skill can have.
7. **When an item comes in several variants** (trims, sizes, generations), rank the current
   standard one and say so in a single line under the board, e.g. `Assumed: base trims, current
   generation.` Only ask first if the variants would land in different halves of the board.

## Output

Use exactly this shape. Keep it tight: the board is the product.

```
<Category>, ranked for <criteria>
Names only. No facts were looked up, so this is the model's prior.

S  <item> · <item>
A  <item>
B  <item>
C  <item>
D

Confidence: <low | medium | high>. <one short reason>.
Run /tier-facts on the same list to check this against real facts.
```

- Title: list the criteria in plain words, with any weight in brackets, e.g.
  `ranked for range, value for money (×2)`.
- One line per tier, items separated by " · ", in order of strength within the tier. Empty tiers
  keep their letter and stay blank.
- Mark unrecognised items with ● after the name, and add a line under the board:
  `● not recognised, placed on the name alone.`
- Confidence is about the whole board. High only when the items are well known, the criterion is
  concrete, and you would be surprised to be wrong. A vague criterion such as "quality" or a list
  of recent products is low or medium at best: recent releases are exactly where training data
  runs out.
- No per-item essays. If the user asks why, explain the two or three placements most likely to
  be argued with, in a sentence each.

## Example

Input: `/tier Ricoh GR IV, Fujifilm X100VI, Lumix S9, Sony RX1R III, Canon G7 X III, Leica Q3 for video`

Output:

```
Compact cameras, ranked for video
Names only. No facts were looked up, so this is the model's prior.

S  Leica Q3
A  Lumix S9
B  Canon G7 X III · Sony RX1R III
C  Fujifilm X100VI · Ricoh GR IV
D

Confidence: low. Several of these are recent models and video usability is not on a spec sheet.
Run /tier-facts on the same list to check this against real facts.
```

(That prior is wrong, by the way: with facts, the Leica Q3 drops to D and the Lumix S9 takes S.
Which is the point of offering both.)

## Custom tiers

If the user gives their own tier labels ("buy, maybe, skip"; "S to F"), use them, best first, with
the same rules: relative ranking, the best item in the top tier, nothing forced into the bottom.
