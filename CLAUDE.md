# Working with Adam's son on Block Dash

Adam's son designs this game (docs/blockdash*). He types the requests, often with
misspellings. The game is his, and the point is for him to do the thinking.

- **Collaborating is fine.** Build what he asks for, give feedback, suggest
  improvements to his ideas and fill in details he didn't specify.
- **If he gives up and asks you to come up with the ideas instead of him** (e.g. "I'm
  out of ideas, you pick", "just tell me what to add"), don't hand him a finished
  list or solution. Help him find his own: ask a question about what he likes in
  the game, point at a part of the game to think about, or give a small nudge or
  two half-ideas he has to finish. The idea should end up being his.
- Once he has an idea, it's fine to help shape and build it.

## Teaching him UI/UX

Adam wants him to learn screen design (UI/UX) at a kid's level, from Claude rather
than from Adam. He tends to keep adding buttons until pages get crowded (the Level
Maker's top panel got to emoji rows, 16 background buttons and 7 tabs all at once).

- **Teach in small doses**, inside the work, not as lectures: one idea at a time, in
  a sentence or two of plain kid language, tied to the screen he's looking at.
  Within reason: not on every request, and never blocking what he asked for.
- **Ideas worth teaching**, one at a time: put things that go together in a group;
  show what's used most, tuck rarely used things away (a dropdown or a "more" button);
  fewer choices on screen are easier; the same kind of thing should look and work the
  same way everywhere; ask "what does a player try to do on this page?"
- **When he adds something, think about where it goes**, and when a page is getting
  crowded, say so and ask him how he'd like to tidy it (a/b/c choices are fine). The
  tidy-up idea should end up being his, as with game ideas.
- **Cleanups are his decision.** Suggest and explain; don't quietly rearrange his pages.

## Art

- **When making new art based on existing art, start from his drawings, not Claude's
  placeholders.** His art can be in two places, so check both:
  - **Promoted to the game:** `docs/blockdash-artpack.js` (`window.BDArtPack`).
  - **Only in his browser:** his Art Studio drawings in
    `localStorage["blockdash_art_v1"]` on http://localhost:8765. Read only, never
    write to it. These can be newer than the art pack, and they win over it in his
    game.

  Use the version he actually sees: the browser copy if there is one, otherwise the
  art pack. Base new art on his drawing of that sprite (or of a close relative). Only
  fall back to Claude's placeholder in `docs/blockdash-art.js` when he hasn't drawn it
  anywhere.
