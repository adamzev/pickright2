# House Building Game - Implementation Guide

## Structure Complete! ✓

The house building game framework is ready. Just need to fill in the room details in `house_game.json`.

## Current Status

- **Code:** 445 lines (well under 1000 limit!)
- **Features Implemented:**
  - ✓ Real-time resource generation with threading
  - ✓ Resource display that updates live
  - ✓ Room decoration selection with cost checking
  - ✓ "Can't afford" warnings
  - ✓ Generator unlocking on correct choices
  - ✓ Game over on wrong choices
  - ✓ Wait screen between rooms to watch resources grow
  - ✓ Win screen after completing all 3 rooms
  - ✓ Seamless transition from original game to house building

## How to Fill in Room Data

Edit `house_game.json` and replace the placeholders:

### For Each Room:

1. **name:** The room name (e.g., "Living Room", "Bedroom", "Kitchen")

2. **ai_hint:** The hint text the AI displays (e.g., "I like natural wooden furniture")

3. **decorations:** Array of 2-4 decoration options
   - Each decoration needs:
     - **name:** What shows in the menu
     - **cost:** Resources needed (e.g., `{"bark": 3, "iron": 1}`)
     - **correct:** `true` for the right choice, `false` for wrong ones
     - **unlocks_generator:** (only for correct choice) Which resource type to generate
     - **success_message:** (for correct) What to show on success
     - **game_over_message:** (for wrong) What to show on failure
     - **picture:** ASCII art lines (optional but recommended!)

### Resource Types Available:

- `bark` - Starting resource
- `iron` - Starting resource
- `wood` - Generated (25 sec per unit)
- `copper` - Generated (30 sec per unit)
- `gold` - Generated (15 min per unit)
- `diamond` - Generated (15 min per unit)

### Tips:

- Room 1 should use starting resources (bark, iron)
- Room 2 should use resources from Room 1 generator (wood)
- Room 3 can use copper, iron, etc.
- Make sure costs are affordable based on what player has!
- The AI hint should guide toward the correct decoration
- Keep ASCII art simple (like in the original game)

## Testing

Run with: `python main.py`

The game will:
1. Play the original adventure (pick house, axe, pet, rescue rock)
2. Show win screen
3. Transition to house building
4. Let you decorate 3 rooms
5. Show final win screen

## Current Placeholder Structure

Each room has 3 decorations (1 correct, 2 wrong).
You can add more wrong options if you want (2-4 decorations per room is good).
