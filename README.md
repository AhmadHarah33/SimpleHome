# SimpleHome

A quiet, fast home screen for older Samsung Smart TVs. Your apps, your inputs, a photo and the time, and nothing else: no ads, no recommendations.

Built for and tested on a **2016 Samsung UE55KU7350 (Tizen 2.4)**, whose browser engine is from 2014. Everything is plain HTML, CSS and ES5 JavaScript, with no live blur or animation, so it stays smooth on slow hardware. Inspired by [CleanFrame](https://github.com/nthnclrk/CleanFrame), which targets newer Samsung TVs.

## Features

- **Two layouts:** a glass **Dock** along the bottom, or a large **List** on the left. Each can show icons and names, icons only, or names only.
- **Apps:** YouTube, Netflix and Spotify by default; add any other app installed on the TV from Settings.
- **Live TV and HDMI inside the app:** channel up/down and typed channel numbers work; Back returns home. Unplugged HDMI ports are hidden automatically, and inputs can be named (PlayStation, Cable box, Apple TV…).
- **Remote shortcuts:** **1–9** open the matching tile, and **Source** steps through your inputs.
- **30 landscape wallpapers** with a full-screen picker (Left/Right to browse, OK to keep, Back to cancel), or a plain **Dark** background. Photos can be dimmed.
- **Slideshow** (every hour or day) and a **screensaver** that shows only the photo and a large clock, which moves corners to avoid burn-in.
- **Picks up where you left off:** with the TV's *Autorun Last App* setting, SimpleHome reopens at power-on and returns to the input you were watching.
- Clock size, 12/24-hour time and date are adjustable. Every choice is saved on the TV.

## Remote controls

| Where | Button | Does |
| --- | --- | --- |
| Home | Left / Right (Dock), Up / Down (List) | Move between tiles |
| Home | OK | Open the app or input |
| Home | Up (Dock) / Right (List) | Wallpaper and Settings buttons |
| Anywhere | 1–9 | Open tile 1–9 |
| Anywhere | Source | Next input |
| Live TV | Channel up/down, numbers | Change channel |
| Live TV / HDMI | Back | Return home |

## Try it in a browser

```sh
python -m http.server 4797 --directory app
```

Open http://localhost:4797 and set the window to 1920×1080. Use the arrow keys, Enter and Escape. Opening apps and inputs only works on a TV.

## Put it on a TV

See **[docs/setup.md](docs/setup.md)**. In short: turn on Developer Mode on the TV, install Tizen Studio, create a signing profile, then:

```sh
python scripts/build.py --profile YourProfile --tv 192.168.1.50 --install --run
```

**Older TVs (2016-era Tizen 2.x) reject Samsung certificates made by current Tizen Studio** with install error 118. Sign with a plain **Tizen** certificate instead; the setup guide explains how.

## Adapting it

- **App IDs** differ between TV models and regions. Add or change them in `KNOWN` at the top of `app/main.js`. `sdb shell 0 vd_applist` lists the IDs on your TV.
- **Wallpapers** are listed in `app/wallpapers.js`. Each needs a 1920×1080 photo, a `-blur` copy (480×270, blurred) for the dock glass, and a 320×180 `-thumb`.
- The app ID `MyTvHome02.SimpleHome` is set in `app/config.xml`, `app/main.js` and `scripts/build.py`. Change all three if you want your own.

## Project layout

| Path | Contents |
| --- | --- |
| `app/` | The TV app: `index.html`, `style.css`, `main.js`, `config.xml`, icons and wallpapers |
| `scripts/build.py` | Package, sign, install and open on a TV |
| `docs/setup.md` | Step-by-step TV setup and troubleshooting |
| `NOTICE.md` | Photo credits, icon sources and trademarks |

## Licence

Code and documentation: [MIT](LICENSE). Photos and brand icons keep their own terms; see [NOTICE.md](NOTICE.md). SimpleHome is an independent project with no Samsung, Netflix, YouTube or Spotify affiliation.
