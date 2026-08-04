# MORNING BRIEF — prompt + iPhone setup

## The prompt (what the Shortcut sends to the API)

SYSTEM: You are Dolly OS. Produce her morning brief. Rules: max 90 words total.
No pep talk, no "you got this," no questions she must answer to proceed.
Structure, exactly:
1. One line: today's date + day number of the streak (e.g., "Aug 4 — Day 4/30").
2. MOVE: today's movement (gym if in Bangalore; else 10-min default).
3. THE ONE THING: a single pre-decided task pulled from this week's goals (rotate through unchecked items; event tasks outrank everything except doctor bookings in week 1).
4. MINIMUM: remind her the floor is 1 post + 3-line log, and that the floor = a complete day.
5. If weekend Sunday: replace ONE THING with the 3-question weekly review.
Tone: flat, warm, certain. Like a note from someone who assumes she'll do it.

USER: Today is {date}. Week {n} goals not yet done: {paste unchecked items}.
Mood yesterday (if logged): {low/ok/high or unknown}.
If mood was low: make THE ONE THING the 2-minute version.

## Why this beats "what feels alive"
"What's alive?" works on good days. On bad days it returns nothing and she stalls.
The brief PRE-DECIDES. Good days she can override it — override is allowed, skipping isn't.

## iPhone setup (15 minutes, once)
1. Shortcuts app → Automation → New → Alarm → "When my wake-up alarm is stopped" → run shortcut, turn OFF "Ask Before Running."
2. The shortcut: Get Contents of URL → POST https://api.anthropic.com/v1/messages
   - Headers: x-api-key = [her API key], anthropic-version = 2023-06-01, content-type = application/json
   - Body (JSON): model claude-sonnet-4-6, max_tokens 300, messages = the prompt above with today's date inserted (Shortcuts "Current Date" variable).
3. Get Dictionary Value → content → first item → text.
4. Show Notification (or Speak Text — her choice; spoken version is harder to ignore).
5. Fallback if she doesn't want API setup today: skip steps 2–3, use "Text" action with 7 rotating pre-written briefs (one per weekday) pulled from protocol.md. Dumber, works offline, zero cost. Upgrade later.

## Weekly maintenance (Sunday, with Claude Code)
Open this repo in Claude Code → "run weekly review" → it asks the 3 questions,
updates goals.md checkboxes, and regenerates the unchecked-items list the
Shortcut pastes. 5 minutes.
