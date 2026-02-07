import curses
import json
import os
import threading
import time
from collections import defaultdict


def load_game_data():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(script_dir, "game.json")) as f:
        return json.load(f)


def display_options(stdscr, options, current_selection):
    for i, option in enumerate(options):
        if i == current_selection:
            stdscr.addstr(3 + i, 2, f"> {option} <", curses.A_REVERSE)
        else:
            stdscr.addstr(3 + i, 4, option)


def select_option(stdscr, option_names, prompt):
    current_selection = 0
    while True:
        stdscr.clear()
        stdscr.addstr(0, 0, prompt, curses.A_BOLD)
        display_options(stdscr, option_names, current_selection)
        stdscr.refresh()
        key = stdscr.getch()

        if key == curses.KEY_UP and current_selection > 0:
            current_selection -= 1
        elif key == curses.KEY_DOWN and current_selection < len(option_names) - 1:
            current_selection += 1
        elif key in [10, 13]:  # Enter key
            return current_selection


def show_picture(stdscr, lines, start_row):
    for i, line in enumerate(lines):
        stdscr.addstr(start_row + i, 0, line)
    return start_row + len(lines)


def show_win_screen(stdscr):
    curses.init_pair(1, curses.COLOR_RED, curses.COLOR_BLACK)
    curses.init_pair(2, curses.COLOR_YELLOW, curses.COLOR_BLACK)
    curses.init_pair(3, curses.COLOR_GREEN, curses.COLOR_BLACK)
    curses.init_pair(4, curses.COLOR_CYAN, curses.COLOR_BLACK)
    curses.init_pair(5, curses.COLOR_MAGENTA, curses.COLOR_BLACK)

    stdscr.clear()
    max_y, max_x = stdscr.getmaxyx()

    row = 0

    # Victory message
    if row + 7 < max_y:
        stdscr.addstr(row, 2, "╔══════════════════════════════╗", curses.A_BOLD)
        stdscr.addstr(row + 1, 2, "║       YOU WIN!!! 🎉          ║", curses.color_pair(2) | curses.A_BOLD)
        stdscr.addstr(row + 2, 2, "║                              ║", curses.A_BOLD)
        stdscr.addstr(row + 3, 2, "║  You and Sir Rock live       ║", curses.A_BOLD)
        stdscr.addstr(row + 4, 2, "║  happily ever after!         ║", curses.A_BOLD)
        stdscr.addstr(row + 5, 2, "║                              ║", curses.A_BOLD)
        stdscr.addstr(row + 6, 2, "╚══════════════════════════════╝", curses.A_BOLD)
        row += 8

    # Sir Rock in celebration
    if row + 5 < max_y:
        stdscr.addstr(row, 10, ".-------.", curses.color_pair(3))
        stdscr.addstr(row + 1, 10, "/   ^_^  \\", curses.color_pair(3))
        stdscr.addstr(row + 2, 10, "|  HAPPY  |", curses.color_pair(3))
        stdscr.addstr(row + 3, 10, "\\_________/", curses.color_pair(3))
        stdscr.addstr(row + 4, 8, "~ Sir Rock ~", curses.color_pair(3) | curses.A_BOLD)
        row += 6

    if row < max_y:
        stdscr.addstr(row, 2, "Press any key to continue...", curses.A_BOLD)

    stdscr.refresh()
    stdscr.getch()


def menu(stdscr):
    curses.curs_set(0)
    curses.start_color()
    data = load_game_data()

    for round_data in data["rounds"]:
        option_names = [opt["name"] for opt in round_data["options"]]
        chosen_idx = select_option(stdscr, option_names, round_data["prompt"])
        option = round_data["options"][chosen_idx]

        picture = option.get("picture", [])
        result_picture = option.get("result_picture")

        if picture and result_picture:
            # Show "You picked:" + picture, then result + result_picture
            stdscr.clear()
            stdscr.addstr(0, 0, "You picked:", curses.A_BOLD)
            next_row = show_picture(stdscr, picture, 1)
            stdscr.addstr(next_row + 1, 0, "Press any key to see what happens...")
            stdscr.refresh()
            stdscr.getch()

            stdscr.clear()
            stdscr.addstr(0, 0, option["result"], curses.A_BOLD)
            next_row = show_picture(stdscr, result_picture, 2)
        elif picture:
            # Show result text + picture
            stdscr.clear()
            stdscr.addstr(0, 0, option["result"], curses.A_BOLD)
            next_row = show_picture(stdscr, picture, 5)
        else:
            stdscr.clear()
            stdscr.addstr(0, 0, option["result"], curses.A_BOLD)
            next_row = 2

        if option.get("game_over"):
            stdscr.addstr(next_row + 1, 0, "GAME OVER. Press any key to exit...")
            stdscr.refresh()
            stdscr.getch()
            return

        stdscr.addstr(next_row + 1, 0, "Press any key to continue...")
        stdscr.refresh()
        stdscr.getch()

    # If we made it through all rounds without game_over, show win screen!
    show_win_screen(stdscr)

    # Transition to house building game
    house_building_game(stdscr)


class ResourceTracker:
    """Manages resources and their real-time generation"""
    def __init__(self, starting_resources, generator_rates):
        self.resources = defaultdict(float)
        self.resources.update(starting_resources)
        self.generators = defaultdict(int)  # How many of each generator we have
        self.generator_rates = generator_rates  # Seconds per resource
        self.running = False
        self.lock = threading.Lock()
        self.thread = None

    def start_generation(self):
        """Start the background resource generation thread"""
        self.running = True
        self.thread = threading.Thread(target=self._generate_loop, daemon=True)
        self.thread.start()

    def stop_generation(self):
        """Stop the background resource generation"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=1)

    def _generate_loop(self):
        """Background loop that generates resources"""
        while self.running:
            time.sleep(1)  # Tick every second
            with self.lock:
                for resource, count in self.generators.items():
                    if count > 0 and resource in self.generator_rates:
                        rate = self.generator_rates[resource]
                        # Generate 1/rate resources per second per generator
                        self.resources[resource] += count / rate

    def add_generator(self, resource_type):
        """Add a generator for a specific resource"""
        with self.lock:
            self.generators[resource_type] += 1

    def can_afford(self, cost):
        """Check if we have enough resources for a purchase"""
        with self.lock:
            for resource, amount in cost.items():
                if self.resources[resource] < amount:
                    return False
            return True

    def spend(self, cost):
        """Spend resources (assumes can_afford was checked)"""
        with self.lock:
            for resource, amount in cost.items():
                self.resources[resource] -= amount

    def get_resources_display(self):
        """Get a formatted string of current resources"""
        with self.lock:
            lines = []
            for resource in sorted(self.resources.keys()):
                amount = int(self.resources[resource])
                if amount > 0 or self.generators.get(resource, 0) > 0:
                    gen_count = self.generators.get(resource, 0)
                    if gen_count > 0:
                        lines.append(f"{resource.capitalize()}: {amount} (+{gen_count} gen)")
                    else:
                        lines.append(f"{resource.capitalize()}: {amount}")
            return lines


def load_house_data():
    """Load house building game data"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(script_dir, "house_game.json")) as f:
        return json.load(f)


def display_resources(stdscr, tracker, start_row=0):
    """Display current resources on screen"""
    stdscr.addstr(start_row, 0, "=== Resources ===", curses.A_BOLD)
    resource_lines = tracker.get_resources_display()
    for i, line in enumerate(resource_lines):
        stdscr.addstr(start_row + 1 + i, 0, line)
    return start_row + 1 + len(resource_lines)


def select_decoration(stdscr, tracker, decorations, room_name, ai_hint):
    """Let player select a decoration, showing costs and resources"""
    current_selection = 0

    while True:
        stdscr.clear()

        # Show resources at top
        next_row = display_resources(stdscr, tracker)
        next_row += 1

        # Show room and AI hint
        stdscr.addstr(next_row, 0, f"Room: {room_name}", curses.A_BOLD)
        next_row += 1
        stdscr.addstr(next_row, 0, f"AI says: {ai_hint}", curses.A_BOLD)
        next_row += 2

        stdscr.addstr(next_row, 0, "Pick a decoration:", curses.A_BOLD)
        next_row += 1

        # Show decoration options with costs
        for i, decoration in enumerate(decorations):
            cost_str = ", ".join([f"{v} {k}" for k, v in decoration["cost"].items()])
            option_text = f"{decoration['name']} (costs: {cost_str})"

            # Check if affordable
            affordable = tracker.can_afford(decoration["cost"])

            if i == current_selection:
                if affordable:
                    stdscr.addstr(next_row + i, 2, f"> {option_text} <", curses.A_REVERSE)
                else:
                    stdscr.addstr(next_row + i, 2, f"> {option_text} < [CAN'T AFFORD]", curses.A_REVERSE)
            else:
                if affordable:
                    stdscr.addstr(next_row + i, 4, option_text)
                else:
                    stdscr.addstr(next_row + i, 4, f"{option_text} [CAN'T AFFORD]", curses.A_DIM)

        stdscr.refresh()
        key = stdscr.getch()

        if key == curses.KEY_UP and current_selection > 0:
            current_selection -= 1
        elif key == curses.KEY_DOWN and current_selection < len(decorations) - 1:
            current_selection += 1
        elif key in [10, 13]:  # Enter key
            # Check if affordable
            if tracker.can_afford(decorations[current_selection]["cost"]):
                return current_selection
            else:
                # Flash a message that they can't afford it
                stdscr.addstr(next_row + len(decorations) + 1, 2,
                             "You don't have enough resources! Press any key...",
                             curses.color_pair(1))
                stdscr.refresh()
                stdscr.getch()


def wait_for_resources_screen(stdscr, tracker):
    """Show a waiting screen where resources generate in real-time"""
    stdscr.nodelay(True)  # Non-blocking input

    try:
        while True:
            stdscr.clear()

            stdscr.addstr(0, 0, "=== Resource Generation ===", curses.A_BOLD)
            stdscr.addstr(1, 0, "Watch your resources grow!")
            stdscr.addstr(2, 0, "Press SPACE when ready to continue...", curses.A_BOLD)

            # Display resources
            display_resources(stdscr, tracker, 4)

            stdscr.refresh()

            # Check for space key
            key = stdscr.getch()
            if key == ord(' '):
                break

            time.sleep(0.1)  # Update display 10 times per second

    finally:
        stdscr.nodelay(False)  # Restore blocking input


def show_house_win_screen(stdscr):
    """Show victory screen for house building game"""
    curses.init_pair(1, curses.COLOR_RED, curses.COLOR_BLACK)
    curses.init_pair(2, curses.COLOR_YELLOW, curses.COLOR_BLACK)
    curses.init_pair(3, curses.COLOR_GREEN, curses.COLOR_BLACK)

    stdscr.clear()
    max_y, max_x = stdscr.getmaxyx()

    row = 0

    # Victory message
    if row + 7 < max_y:
        stdscr.addstr(row, 2, "╔══════════════════════════════╗", curses.A_BOLD)
        stdscr.addstr(row + 1, 2, "║   HOUSE COMPLETE!!! 🏠       ║", curses.color_pair(2) | curses.A_BOLD)
        stdscr.addstr(row + 2, 2, "║                              ║", curses.A_BOLD)
        stdscr.addstr(row + 3, 2, "║  The AI loves your house!    ║", curses.A_BOLD)
        stdscr.addstr(row + 4, 2, "║  Sir Rock has a cozy home!   ║", curses.A_BOLD)
        stdscr.addstr(row + 5, 2, "║                              ║", curses.A_BOLD)
        stdscr.addstr(row + 6, 2, "╚══════════════════════════════╝", curses.A_BOLD)
        row += 8

    # House ASCII art
    if row + 6 < max_y:
        stdscr.addstr(row, 10, "        /\\       ", curses.color_pair(3))
        stdscr.addstr(row + 1, 10, "       /  \\      ", curses.color_pair(3))
        stdscr.addstr(row + 2, 10, "      /____\\     ", curses.color_pair(3))
        stdscr.addstr(row + 3, 10, "     |      |    ", curses.color_pair(3))
        stdscr.addstr(row + 4, 10, "     |  []  |    ", curses.color_pair(3))
        stdscr.addstr(row + 5, 10, "     |______|    ", curses.color_pair(3))
        row += 7

    # Sir Rock in his house
    if row + 3 < max_y:
        stdscr.addstr(row, 6, ".-------.", curses.color_pair(3))
        stdscr.addstr(row + 1, 6, "/   ^_^  \\  <- Sir Rock!", curses.color_pair(3))
        stdscr.addstr(row + 2, 6, "\\________/", curses.color_pair(3))
        row += 4

    if row < max_y:
        stdscr.addstr(row, 2, "Press any key to exit...", curses.A_BOLD)

    stdscr.refresh()
    stdscr.getch()


def house_building_game(stdscr):
    """Main house building game loop"""
    curses.curs_set(0)

    # Load house data
    house_data = load_house_data()

    # Initialize resource tracker
    tracker = ResourceTracker(
        house_data["starting_resources"],
        house_data["resource_generators"]
    )

    # Add starting generators (e.g., iron generator from completing first game)
    for resource_type, count in house_data.get("starting_generators", {}).items():
        for _ in range(count):
            tracker.add_generator(resource_type)

    tracker.start_generation()

    try:
        # Introduction
        stdscr.clear()
        stdscr.addstr(0, 0, "Now let's build Sir Rock a house!", curses.A_BOLD)
        stdscr.addstr(2, 0, "You'll need to decorate rooms the way the AI likes them.")
        stdscr.addstr(3, 0, "Correct choices unlock resource generators!")
        stdscr.addstr(4, 0, "Wrong choices = GAME OVER")
        stdscr.addstr(6, 0, "You start with 6 wood, 2 iron, and an iron generator!")
        stdscr.addstr(8, 0, "Press any key to start...")
        stdscr.refresh()
        stdscr.getch()

        # Process each room
        for room_idx, room_data in enumerate(house_data["rooms"]):
            # Show waiting screen if not first room
            if room_idx > 0:
                wait_for_resources_screen(stdscr, tracker)

            # Select decoration for this room
            chosen_idx = select_decoration(
                stdscr,
                tracker,
                room_data["decorations"],
                room_data["name"],
                room_data["ai_hint"]
            )

            decoration = room_data["decorations"][chosen_idx]

            # Spend resources
            tracker.spend(decoration["cost"])

            # Show what was picked
            stdscr.clear()
            stdscr.addstr(0, 0, f"You picked: {decoration['name']}", curses.A_BOLD)
            picture = decoration.get("picture", [])
            if picture:
                next_row = show_picture(stdscr, picture, 2)
            else:
                next_row = 2

            stdscr.addstr(next_row + 1, 0, "Press any key to see the result...")
            stdscr.refresh()
            stdscr.getch()

            # Check if correct
            if decoration.get("correct"):
                # Success!
                stdscr.clear()
                stdscr.addstr(0, 0, decoration["success_message"], curses.color_pair(3) | curses.A_BOLD)

                # Unlock generator
                generator_type = decoration.get("unlocks_generator")
                if generator_type:
                    tracker.add_generator(generator_type)
                    stdscr.addstr(2, 0, f"You now have a {generator_type} generator!", curses.A_BOLD)

                stdscr.addstr(4, 0, "Press any key to continue...")
                stdscr.refresh()
                stdscr.getch()
            else:
                # Game over
                stdscr.clear()
                game_over_msg = decoration.get("game_over_message", "GAME OVER")
                stdscr.addstr(0, 0, game_over_msg, curses.color_pair(1) | curses.A_BOLD)
                stdscr.addstr(2, 0, "GAME OVER. Press any key to exit...")
                stdscr.refresh()
                stdscr.getch()
                return

        # If we made it through all rooms, show win screen!
        show_house_win_screen(stdscr)

    finally:
        tracker.stop_generation()


def main():
    curses.wrapper(menu)


if __name__ == "__main__":
    main()
