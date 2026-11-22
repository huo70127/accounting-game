# Demo art and sound assets

## Approved companions

`dist/demo/assets/companions-approved.png` is an unchanged copy of the user-approved original 2D character sheet, generated for this project. The 3D drafts and original generated images remain in `/workspace/generated_images`. The app displays the large seated pair or the approved expressions through SVG viewports; it does not redraw or distort the characters. The attempted transparent-background derivative was not used.

`dist/demo/assets/companions-neutral.png` is an AI-generated edit of that approved sheet for v18. Only the default seated pair uses this asset: naturally resting animal muzzles replace the human-like upward smile. Approved proportions, clothes and species distinctions are retained. Other expressions continue to use the unchanged original sheet; the approved original is retained. Every sheet viewport clips its image to an explicit rectangle in sheet coordinates, including letterboxed viewports; this prevents adjacent poses leaking into the displayed expression. The edit was created for this project, not traced from another mascot.

## Scene companions (v21)

`dist/demo/assets/companions-scenes.png` is an original AI-generated six-scene atlas based on the approved and neutral sheets above. It preserves the animal proportions, red panda lemon dudou, raccoon tea-cup waistcoat and natural muzzles. The 1536 × 1024 image has two columns and three rows: budgeting, startup funding, making tea, handing over tea and collecting coins, celebration, and closing the ledger. It was visually inspected before integration. The original generated file is retained at `/workspace/generated_images/exec-fcff5845-489c-40bf-8a1d-cf19f1d1452f.png`.

Each scene uses its own explicit SVG clip rectangle in sheet coordinates, including exact thirds for row heights. Shared props stay within a paired viewport, avoiding cuts through the central sketch, cup or ledger. Original approved sheets are retained. The app selects a pose for the current activity; new poses do not predict unseen outcomes.

## Recorded coin Foley

The current receipt cue is `dist/demo/assets/audio/coins-jar-pour.mp3`, derived from **Coins Dropping**, by **AlyssaB2043**: https://freesound.org/people/AlyssaB2043/sounds/466846/ — **CC0 1.0**, https://creativecommons.org/publicdomain/zero/1.0/ . The author describes actual coins dropping and rolling in a jar. Source used: public HQ preview https://cdn.freesound.org/previews/466/466846_9648444-hq.mp3 , excerpt 35.05–35.93 seconds. No money-bag landing is layered into this cue.

The retained comparison `dist/demo/assets/audio/coins-glass-clinks.mp3` uses **COINS IN A GLASS 17.wav**, by **stebbi30000** (Freesound uploader): https://freesound.org/people/stebbi30000%40gmail.com/sounds/341416/ — **CC0 1.0**. The author describes Icelandic coins dropped into a glass. Source used: public HQ preview https://cdn.freesound.org/previews/341/341416_1620724-hq.mp3 , excerpt 0.15–1.05 seconds.

Both cues preserve the recorded coin impacts and high-frequency detail, with a 180 Hz high-pass, gentle narrow resonance cuts, transient control and edge fades. They are stereo MP3, 44.1 kHz, 160 kbit/s, 0.88 / 0.90 seconds decoded. Detailed source hashes, exact filters, measurements and listening limits are in `design/audio/COINS_CLINKS.md`. The new filenames avoid reusing the cached v28 cue. Completion E and master-volume preferences are unchanged.

The superseded v28 cue `dist/demo/assets/audio/coins-pouch-soft.mp3` is retained for comparison. It derives from **Sack of Gold**, by **Amarikah**, with collaborator **pennomi**. Source and license: https://opengameart.org/content/sack-of-gold — **CC0 1.0**, https://creativecommons.org/publicdomain/zero/1.0/ . Public download: https://opengameart.org/sites/default/files/gold_sack.wav . This is recorded Foley of a sack of coins landing on a table and coins moving, not a synthesized cash-register beep.

v28 edits: short drop and movement excerpts, overlapped by 120 ms; high-pass at 90 Hz; cascaded low-pass filtering and a 3.2 kHz cut; gentle compression, peak limiting and short fades. Asset: stereo MP3, 44.1 kHz, 160 kbit/s, 0.95 seconds. Its numerical peak was lower, but the user found the bag impact and muffled character less suitable than the previous cue. Exact source checksum, render parameters and comparison remain in `design/audio/COINS_SOFT.md` as historical evidence, not a current quality claim.

The retired `dist/demo/assets/audio/coins-bag.mp3` is retained for historical comparison. It combines short portions of two publicly available CC0 recordings:

- **Purchasing Sound Effect**, Spring Spring. https://opengameart.org/content/purchasing-sound-effect — source download `snd_purchase_0.wav`; CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/ . Description: made by jingling coins. Used the opening 1.25 seconds, filtered for clarity and compressed lightly.
- **Dropping bag of money on a table**, hz37. https://freesound.org/people/hz37/sounds/792317/ — public HQ preview `https://cdn.freesound.org/previews/792/792317_123355-hq.mp3`; CC0 1.0. Author describes a Neumann TLM 102 recording of a bag of coins. Used 0.17–0.85 seconds, placed 340 ms after the first track for the physical bag landing.

Old-cue edits: high-pass filtering, a small 3.2 kHz lift, compression, a short fade and loudness processing. Historical asset is stereo MP3, 44.1 kHz, 160 kbit/s, about 1.25 seconds of decoded audio. Source files remain in `/workspace/audio-sources`, outside the published app. No Freesound login or paid download was used.

## Completion sound

`dist/demo/assets/audio/level-complete.mp3` is the user-selected **E · Mini-orchestra fanfare**, an original four-note celebration arranged from recorded trumpet, F horn, glockenspiel, cymbal and triangle samples. It is an unchanged copy of the approved audition `E-mini-orchestra-fanfare.mp3`: stereo MP3, 48 kHz, 192 kbit/s, 2.2 seconds, measured at about -16.28 LUFS and -5.06 dBTP.

Instrument recordings are from **VSCO 2 Community Edition**, Versilian Studios; recorded by Sam Gossner and Simon Dalzell, sample cutting by Elan Hickler / Soundemote. Source: https://github.com/sgossner/VSCO-2-CE . License: CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/ . A copy of the license and the exact nine source paths, URLs and Git blob checksums are retained in `design/audio/VSCO-LICENSE.txt` and `design/audio/VSCO-SOURCES.json`.

Edits: note selection, modest pitch changes, duration/envelope adjustment, panning, short room reflections, high-pass filtering and two-pass loudness processing. Composition and arrangement are original to this project. The audition renderer and original recordings remain in `/workspace/audio-candidates`; the checked-in MP3 is ready to serve without a build. No audio or melody from Duolingo, The Witcher or other games was used. `scripts/build-sounds.py` retains an earlier soft two-beat experiment and does not produce the selected E cue.

## Retained audition references

Audition masters remain outside `dist/`:

- `design/audio/A-bright-two-beat.mp3`: the project's original bright two-beat synthesis, retained as the comparison preferred in the first audition round. An identical copy is served as `dist/demo/assets/audio/concept-discovery.mp3` for the brief new-statement / accounting-equation reveal; E remains the completion cue.
- `design/audio/F-orchestral-winning-jingle.mp3`: **"Won! (Orchestral winning jingle)" by spuispuin**, https://opengameart.org/content/won-orchestral-winning-jingle , licensed under **CC BY 4.0**, https://creativecommons.org/licenses/by/4.0/ . Source: https://opengameart.org/sites/default/files/Won%21.wav . Changes: kept the first 2.95 seconds, added edge fades, loudness processing and MP3 encoding. Reserved for possible final-completion use; it currently has no playback trigger.

## Playback

Default master volume is 82%. Volume and mute preferences persist locally. Assets are loaded and decoded after a user gesture; missing or undecodable assets use short synthesized fallbacks. The completion fallback keeps two musical attack times. Muting and hiding the page stop current playback and cancel delayed sounds. No autoplay is triggered by loading a save.


## 独立手写试验的数字模型（v26）

`dist/handwriting/digits.f32` 是本项目基于 MNIST 训练的小型数字识别权重；模型权重及 `design/handwriting-model-fixtures.json` 的归一化留出样本按 CC BY-SA 3.0 提供。MNIST 数据版权归 Yann LeCun、Corinna Cortes，整理亦归功于 Christopher J. C. Burges；下载自 TensorFlow/Keras 官方镜像。模型无需第三方浏览器推理库，笔迹不上传。完整署名与许可证链接随试验页提供于 `dist/handwriting/credits.txt`，训练源代码为 `design/train-handwriting.py`。主游戏与原角色、音效的归属及许可保持原有说明。
