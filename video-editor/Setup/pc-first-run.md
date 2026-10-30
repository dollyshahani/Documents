# First run on Dolly's Windows PC

The cloud session already wrote the files, downloaded the fonts and tested build_ass,
animate and render (they pass). What it could NOT do, because it isn't her PC:

1. **Get the folder onto the PC**
   ```powershell
   winget install Git.Git
   git clone https://github.com/dollyshahani/Documents.git $HOME\Documents\dolly
   ```
   The studio is then `$HOME\Documents\dolly\video-editor`.
   To let a cloud Claude session work here: Claude desktop app → Settings → Claude Code →
   Remote Control → add the `dolly` folder (it must be the git repo root).

2. **Tools** (in PowerShell):
   ```powershell
   winget install Gyan.FFmpeg      # full build, includes libass
   winget install Python.Python.3.12
   python -m pip install faster-whisper numpy pillow
   ```
   Open a new terminal, then check: `ffmpeg -version`, `python -c "import faster_whisper, PIL, numpy; print('ok')"`.
   The first transcription downloads the Whisper `small.en` model (~480 MB), once.

3. **Fonts for captions/titles** — libass reads fonts from each project's `fonts\` folder.
   At intake, copy `Signature Style\fonts` into `Projects\<name>\fonts`.

4. **LocalSend (phone → Raw)**
   - PC: `winget install LocalSend.LocalSend`, open it → Settings → Receive →
     **Destination** = `...\video-editor\Raw`, turn on **Quick Save** (no tap needed to accept).
     Allow it through Windows Firewall when asked (Private networks).
   - Phone: install LocalSend (App Store / Play Store), same Wi-Fi as the PC.
   - Send a clip: LocalSend on phone → Send → pick the video → tap the PC. It lands in Raw.

5. **Dolly OS hand-off** — copy `.env.example` to `.env` and fill in the same Supabase URL,
   service-role key, app URL and CRON_SECRET as Vercel.

6. **Needs a real recording to test:** transcribe.py and plan.py (Whisper), the LISTEN-BACK
   check, GLAM/DENOISE on her actual face and room noise, and send_to_dollyos.py (needs .env).
   Say "start the edit" with a clip in Raw to run the whole workflow.
