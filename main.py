import curses
import json
import os


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

    # Confetti!
    confetti = [
        ("*", 1, 5), (".", 2, 8), ("*", 3, 12), ("o", 4, 18), ("*", 5, 25),
        (".", 1, 30), ("*", 2, 35), ("o", 3, 40), ("*", 4, 45), (".", 5, 50),
        ("o", 1, 55), ("*", 2, 60), (".", 3, 3), ("*", 4, 10), ("o", 5, 15),
        ("*", 1, 20), (".", 2, 28), ("o", 3, 33), ("*", 4, 38), (".", 5, 48),
    ]

    for char, color, x in confetti:
        stdscr.addstr(1, x, char, curses.color_pair(color) | curses.A_BOLD)

    # Victory message
    stdscr.addstr(3, 15, "╔══════════════════════════════╗", curses.A_BOLD)
    stdscr.addstr(4, 15, "║                              ║", curses.A_BOLD)
    stdscr.addstr(5, 15, "║       YOU WIN!!! 🎉          ║", curses.color_pair(2) | curses.A_BOLD)
    stdscr.addstr(6, 15, "║                              ║", curses.A_BOLD)
    stdscr.addstr(7, 15, "║  You and Sir Rock live       ║", curses.A_BOLD)
    stdscr.addstr(8, 15, "║  happily ever after!         ║", curses.A_BOLD)
    stdscr.addstr(9, 15, "║                              ║", curses.A_BOLD)
    stdscr.addstr(10, 15, "╚══════════════════════════════╝", curses.A_BOLD)

    # Sir Rock in celebration
    stdscr.addstr(12, 22, ".-------.", curses.color_pair(3))
    stdscr.addstr(13, 22, "/   ^_^  \\", curses.color_pair(3))
    stdscr.addstr(14, 22, "|  HAPPY  |", curses.color_pair(3))
    stdscr.addstr(15, 22, "\\_________/", curses.color_pair(3))
    stdscr.addstr(16, 20, "~ Sir Rock ~", curses.color_pair(3) | curses.A_BOLD)

    # More confetti at bottom
    for char, color, x in confetti:
        stdscr.addstr(18, x, char, curses.color_pair(color) | curses.A_BOLD)

    stdscr.addstr(20, 15, "Press any key to exit...", curses.A_BOLD)
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


def main():
    curses.wrapper(menu)


if __name__ == "__main__":
    main()
