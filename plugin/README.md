# Motion Graphics Pro (Claude plugin) v2.4.1

Three Claude skills that take a motion graphics video from a plain-language brief to a finished file:
`motion-graphics-pro` (production flow, mgp renderer, 260 blocks, 104 motion packs), `motion-graphics`
(motion principles + JS motion library) and `vector-character` (vector characters in code).

## Install

- **claude.ai / Cowork**: Customize > Plugins > Upload plugin (this ZIP), or Add marketplace `salimmoo/motion-graphics-pro`.
- **Claude Code**: `/plugin marketplace add salimmoo/motion-graphics-pro`, then `/plugin install motion-graphics-pro@salimmoo`.
- **Manual**: copy `skills/*` to `~/.claude/skills/`.

Skills are invoked as `/motion-graphics-pro:motion-graphics-pro`, `/motion-graphics-pro:motion-graphics` and
`/motion-graphics-pro:vector-character`, or picked automatically from the request.

Rendering needs Node.js 22+, ffmpeg and Chrome/Edge/Chromium on the machine that runs the commands. The optional
local voice and image engines are installed once per computer with `mgp install` (models are not in the plugin).
Voice profiles and engines live in `~/.mgp`, outside the plugin folder, so updates never remove them.

Guide: https://salimmoo.github.io/motion-graphics-pro/ · Source: https://github.com/salimmoo/motion-graphics-pro · Licence: `LICENSE.md` · Credits: `NOTICE.md` · Changes: `CHANGELOG.md`
