# Alfred Cron Job System

This system allows scheduling commands that "pulse" to the Alfred interface.

## Format
Each `.md` file in this folder must follow this format:
- Line 1: Title of the job
- Line 2: Cron expression (standard 5-field format)
- Line 3: Command to trigger (e.g., `paint("blue")`)

## Argument Types
- **Strings**: Wrap in double or single quotes. Example: `paint("yellow")`
- **Numbers**: Pass directly. Example: `set_volume(50)`
- **Multiple Arguments**: Separate with commas. Example: `play_music("nice", 1)`

## Examples

### Change background color to blue every morning at 8 AM
```md
Morning Blue
0 8 * * *
paint("blue")
```

### Play music every hour
```md
Hourly Music
0 * * * *
play_music("nice")
```

## How it works
1. The Deno server watches this folder for changes.
2. When a file is added or modified, the job is scheduled.
3. When the cron triggers, a "pulse" is sent via SSE to all connected Alfred interfaces.
4. The frontend receives the pulse and executes the command.
