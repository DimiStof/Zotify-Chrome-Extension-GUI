(() => {
  const PANEL_ID = "spotify-zotify-runner-panel";
  const STYLE_ID = "spotify-zotify-runner-style";
  const STORAGE_KEY_CLOSED = "spotifyHelperClosed";

  const state = {
    pageType: null,
    pageId: null,
    title: null,
    accountType: "Unknown",
    error: null,
    info: null,
    audioFormat: "mp3",
    quality: "high",
    realTime: true,
    lyricsFile: true,
    skipDuplicates: true,
    outputPreset: "playlist",
    albumLibrary: "",
    podcastLibrary: "",
    playlistLibrary: "",
    commandPreview: "",
    printErrors: true,
    printProgress: true,
    printDownloads: false,
    printSkips: false,
    printWarnings: true,
    saveMetadata: true,
    saveGenre: false,
    playlistFile: false,
    isClosed: false,
    downloadFolder: "",
    isRunning: false
  };

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} {
        position: fixed;
        top: 88px;
        right: 20px;
        width: 410px;
        max-height: calc(100vh - 120px);
        overflow: auto;
        background: #121212;
        color: #fff;
        border: 1px solid #2a2a2a;
        border-radius: 14px;
        padding: 16px;
        z-index: 999999;
        box-shadow: 0 12px 32px rgba(0,0,0,0.45);
        font-family: Arial, sans-serif;
      }
	  
    #${PANEL_ID} .dualRow {
	  display: flex;
	  gap: 12px; /* slightly wider gap */
	}

	#${PANEL_ID} .dualRow button {
	  flex: 1;
	}

      #${PANEL_ID} .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }

      #${PANEL_ID} h3 {
        margin: 0;
        font-size: 17px;
      }

      #${PANEL_ID} .closeBtn {
        width: 28px;
        height: 28px;
        border: 0;
        border-radius: 999px;
        background: #2a2a2a;
        color: #fff;
        font-size: 16px;
        line-height: 1;
        cursor: pointer;
        flex: 0 0 auto;
      }

      #${PANEL_ID} .closeBtn:hover {
        background: #3a3a3a;
      }

      #${PANEL_ID} .section {
        margin-bottom: 12px;
      }

      #${PANEL_ID} .meta,
      #${PANEL_ID} .small {
        font-size: 12px;
        color: #b3b3b3;
        line-height: 1.45;
      }

      #${PANEL_ID} label {
        display: block;
        font-size: 12px;
        margin-bottom: 5px;
        color: #b3b3b3;
      }

      #${PANEL_ID} select,
      #${PANEL_ID} input[type="text"] {
        width: 100%;
        padding: 8px 10px;
        border-radius: 8px;
        border: 1px solid #333;
        background: #181818;
        color: #fff;
        box-sizing: border-box;
      }

      #${PANEL_ID} .checkboxRow {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      #${PANEL_ID} .checkboxRow label {
        margin: 0;
        color: #fff;
      }

      #${PANEL_ID} .buttonRow {
        display: flex;
        gap: 8px;
      }

      #${PANEL_ID} button.actionBtn {
        flex: 1;
        padding: 10px;
        border: 0;
        border-radius: 999px;
        cursor: pointer;
        font-weight: 700;
      }

      #${PANEL_ID} button.actionBtn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      #${PANEL_ID} .primaryBtn {
        background: #1db954;
        color: #000;
      }

      #${PANEL_ID} .secondaryBtn {
        background: #2a2a2a;
        color: #fff;
      }

      #${PANEL_ID} .error {
        background: rgba(255, 77, 77, 0.12);
        border: 1px solid rgba(255, 77, 77, 0.35);
        color: #ff8a8a;
        padding: 8px;
        border-radius: 8px;
        font-size: 12px;
        line-height: 1.45;
        white-space: pre-wrap;
      }

      #${PANEL_ID} .ok {
        background: rgba(29, 185, 84, 0.12);
        border: 1px solid rgba(29, 185, 84, 0.35);
        color: #8ce7ac;
        padding: 8px;
        border-radius: 8px;
        font-size: 12px;
        line-height: 1.45;
        white-space: pre-wrap;
      }

      #${PANEL_ID} pre {
        white-space: pre-wrap;
        word-break: break-word;
        background: #0d0d0d;
        border: 1px solid #2a2a2a;
        border-radius: 8px;
        padding: 10px;
        font-size: 11px;
        color: #ddd;
      }
	  
	  #${PANEL_ID} .killBtn {
		background: #ff3b3b;
		color: #fff;
	  }

      #${PANEL_ID} hr {
        border: none;
        border-top: 1px solid #2a2a2a;
        margin: 14px 0;
      }
    `;
    document.head.appendChild(style);
  }

  function parseSpotifyUrl(url) {
    const u = new URL(url);
    const match = u.pathname.match(/^\/(album|playlist|track)\/([a-zA-Z0-9]+)$/);
    if (!match) return null;
    return { type: match[1], id: match[2] };
  }

  function getPageTitle() {
    const selectors = [
      'h1[data-encore-id="type"]',
      '[data-testid="entityTitle"]',
      "main h1"
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent && el.textContent.trim()) {
        return el.textContent.trim();
      }
    }

    return document.title.replace(" | Spotify", "").trim() || "Unknown";
  }

  function detectAccountType() {
    const bodyText = document.body?.innerText || "";
    if (/Premium/i.test(bodyText)) return "Premium";
    if (/Free/i.test(bodyText)) return "Free";
    return "Unknown";
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function buildPayload() {
    return {
      targetType: state.pageType,
      targetId: state.pageId,
      targetUrl: location.href,
      title: state.title,
      accountType: state.accountType,
      options: {
        audioFormat: state.audioFormat,
        quality: state.quality,
        realTime: state.realTime,
        lyricsFile: state.lyricsFile,
        skipDuplicates: state.skipDuplicates,
        outputPreset: state.outputPreset,
        albumLibrary: state.albumLibrary,
        podcastLibrary: state.podcastLibrary,
        playlistLibrary: state.playlistLibrary,
        printErrors: state.printErrors,
        printProgress: state.printProgress,
        printDownloads: state.printDownloads,
        printSkips: state.printSkips,
        printWarnings: state.printWarnings,
        saveMetadata: state.saveMetadata,
        saveGenre: state.saveGenre,
        playlistFile: state.playlistFile
      }
    };
  }

  function getExpectedDownloadFolder() {
    if (state.pageType === "album") {
      return state.albumLibrary.trim();
    }
    if (state.pageType === "playlist") {
      return state.playlistLibrary.trim();
    }
    if (state.pageType === "track") {
      return state.playlistLibrary.trim() || state.albumLibrary.trim();
    }
    return "";
  }

  async function saveSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: "SAVE_SETTINGS",
        payload: {
          audioFormat: state.audioFormat,
          quality: state.quality,
          realTime: state.realTime,
          lyricsFile: state.lyricsFile,
          skipDuplicates: state.skipDuplicates,
          outputPreset: state.outputPreset,
          albumLibrary: state.albumLibrary,
          podcastLibrary: state.podcastLibrary,
          playlistLibrary: state.playlistLibrary,
          printErrors: state.printErrors,
          printProgress: state.printProgress,
          printDownloads: state.printDownloads,
          printSkips: state.printSkips,
          printWarnings: state.printWarnings,
          saveMetadata: state.saveMetadata,
          saveGenre: state.saveGenre,
          playlistFile: state.playlistFile
        }
      }, () => resolve());
    });
  }

  async function saveClosedState() {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY_CLOSED]: state.isClosed }, () => resolve());
    });
  }

  async function loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "LOAD_SETTINGS" }, (response) => {
        const settings = response?.settings || {};
        state.audioFormat = settings.audioFormat || state.audioFormat;
        state.quality = settings.quality || state.quality;
        state.realTime = typeof settings.realTime === "boolean" ? settings.realTime : state.realTime;
        state.lyricsFile = typeof settings.lyricsFile === "boolean" ? settings.lyricsFile : state.lyricsFile;
        state.skipDuplicates = typeof settings.skipDuplicates === "boolean" ? settings.skipDuplicates : state.skipDuplicates;
        state.outputPreset = settings.outputPreset || state.outputPreset;
        state.albumLibrary = settings.albumLibrary || "";
        state.podcastLibrary = settings.podcastLibrary || "";
        state.playlistLibrary = settings.playlistLibrary || "";
        state.printErrors = typeof settings.printErrors === "boolean" ? settings.printErrors : state.printErrors;
        state.printProgress = typeof settings.printProgress === "boolean" ? settings.printProgress : state.printProgress;
        state.printDownloads = typeof settings.printDownloads === "boolean" ? settings.printDownloads : state.printDownloads;
        state.printSkips = typeof settings.printSkips === "boolean" ? settings.printSkips : state.printSkips;
        state.printWarnings = typeof settings.printWarnings === "boolean" ? settings.printWarnings : state.printWarnings;
        state.saveMetadata = typeof settings.saveMetadata === "boolean" ? settings.saveMetadata : state.saveMetadata;
        state.saveGenre = typeof settings.saveGenre === "boolean" ? settings.saveGenre : state.saveGenre;
        state.playlistFile = typeof settings.playlistFile === "boolean" ? settings.playlistFile : state.playlistFile;

        chrome.storage.local.get([STORAGE_KEY_CLOSED], (result) => {
          state.isClosed = Boolean(result[STORAGE_KEY_CLOSED]);
          resolve();
        });
      });
    });
  }

  function closePanel() {
    state.isClosed = true;
    saveClosedState();
    const existing = document.getElementById(PANEL_ID);
    if (existing) existing.remove();
  }

  function ensurePanelCanOpen() {
    if (state.isClosed) {
      state.isClosed = false;
      saveClosedState();
    }
  }

  function buildPanel() {
    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement("div");
      panel.id = PANEL_ID;
      document.body.appendChild(panel);
    }

    panel.innerHTML = `
      <div class="header">
        <h3>Zotify Runner</h3>
        <button class="closeBtn" id="helper-close" title="Close">×</button>
      </div>

      <div class="section meta">
        <div><strong>Type:</strong> ${escapeHtml(state.pageType || "Unsupported page")}</div>
        <div><strong>Title:</strong> ${escapeHtml(state.title || "Unknown")}</div>
        <div><strong>Account:</strong> ${escapeHtml(state.accountType)}</div>
      </div>

      <hr>

      <div class="section">
        <label for="helper-format">Audio format</label>
        <select id="helper-format">
          <option value="aac" ${state.audioFormat === "aac" ? "selected" : ""}>AAC</option>
          <option value="fdk_aac" ${state.audioFormat === "fdk_aac" ? "selected" : ""}>FDK AAC</option>
          <option value="flac" ${state.audioFormat === "flac" ? "selected" : ""}>FLAC</option>
          <option value="mp3" ${state.audioFormat === "mp3" ? "selected" : ""}>MP3</option>
          <option value="opus" ${state.audioFormat === "opus" ? "selected" : ""}>Opus</option>
          <option value="vorbis" ${state.audioFormat === "vorbis" ? "selected" : ""}>Vorbis</option>
          <option value="wav" ${state.audioFormat === "wav" ? "selected" : ""}>WAV</option>
          <option value="wavpack" ${state.audioFormat === "wavpack" ? "selected" : ""}>WavPack</option>
        </select>
      </div>

      <div class="section">
        <label for="helper-quality">Download quality</label>
        <select id="helper-quality">
          <option value="normal" ${state.quality === "normal" ? "selected" : ""}>Normal</option>
          <option value="high" ${state.quality === "high" ? "selected" : ""}>High</option>
          <option value="very_high" ${state.quality === "very_high" ? "selected" : ""}>Very High</option>
          <option value="auto" ${state.quality === "auto" ? "selected" : ""}>Auto</option>
        </select>
      </div>

      <div class="section">
        <label for="helper-output-preset">Output preset</label>
        <select id="helper-output-preset">
          <option value="playlist" ${state.outputPreset === "playlist" ? "selected" : ""}>Playlist layout</option>
          <option value="artist_album" ${state.outputPreset === "artist_album" ? "selected" : ""}>Artist / album</option>
          <option value="flat" ${state.outputPreset === "flat" ? "selected" : ""}>Default naming</option>
        </select>
      </div>

      <div class="section">
        <label for="helper-album-library">Album library</label>
        <input id="helper-album-library" type="text" value="${escapeHtml(state.albumLibrary)}" placeholder="Optional">
      </div>

      <div class="section">
        <label for="helper-podcast-library">Podcast library</label>
        <input id="helper-podcast-library" type="text" value="${escapeHtml(state.podcastLibrary)}" placeholder="Optional">
      </div>

      <div class="section">
        <label for="helper-playlist-library">Playlist library</label>
        <input id="helper-playlist-library" type="text" value="${escapeHtml(state.playlistLibrary)}" placeholder="Optional">
      </div>

      <div class="section">
        <div class="checkboxRow">
          <input type="checkbox" id="helper-real-time" ${state.realTime ? "checked" : ""}>
          <label for="helper-real-time">Live rate (--download-real-time)</label>
        </div>

        <div class="checkboxRow">
          <input type="checkbox" id="helper-lyrics-file" ${state.lyricsFile ? "checked" : ""}>
          <label for="helper-lyrics-file">Save lyrics (--lyrics-file)</label>
        </div>

        <div class="checkboxRow">
          <input type="checkbox" id="helper-skip-duplicates" ${state.skipDuplicates ? "checked" : ""}>
          <label for="helper-skip-duplicates">Skip dupes (--skip-duplicates)</label>
        </div>

        <div class="checkboxRow">
          <input type="checkbox" id="helper-save-metadata" ${state.saveMetadata ? "checked" : ""}>
          <label for="helper-save-metadata">Save tags (--save-metadata)</label>
        </div>

        <div class="checkboxRow">
          <input type="checkbox" id="helper-save-genre" ${state.saveGenre ? "checked" : ""}>
          <label for="helper-save-genre">Genre tag (--save-genre)</label>
        </div>

        <div class="checkboxRow">
          <input type="checkbox" id="helper-playlist-file" ${state.playlistFile ? "checked" : ""}>
          <label for="helper-playlist-file">Save m3u8 (--playlist-file)</label>
        </div>

        <div class="checkboxRow">
          <input type="checkbox" id="helper-print-downloads" ${state.printDownloads ? "checked" : ""}>
          <label for="helper-print-downloads">Done logs (--print-downloads)</label>
        </div>

        <div class="checkboxRow">
          <input type="checkbox" id="helper-print-progress" ${state.printProgress ? "checked" : ""}>
          <label for="helper-print-progress">Show bars (--print-progress)</label>
        </div>

        <div class="checkboxRow">
          <input type="checkbox" id="helper-print-skips" ${state.printSkips ? "checked" : ""}>
          <label for="helper-print-skips">Skip logs (--print-skips)</label>
        </div>

        <div class="checkboxRow">
          <input type="checkbox" id="helper-print-warnings" ${state.printWarnings ? "checked" : ""}>
          <label for="helper-print-warnings">Warn logs (--print-warnings)</label>
        </div>

        <div class="checkboxRow">
          <input type="checkbox" id="helper-print-errors" ${state.printErrors ? "checked" : ""}>
          <label for="helper-print-errors">Error logs (--print-errors)</label>
        </div>
      </div>

      <div class="section">
        <div class="buttonRow">
          <button class="actionBtn primaryBtn" id="helper-run">
			 Run Zotify
		  </button>
          <button class="actionBtn secondaryBtn" id="helper-copy">Copy command</button>
        </div>
      </div>
	  
	<div class="section">
	  <div class="buttonRow dualRow">
		<button class="actionBtn killBtn" id="helper-kill">
		  Stop Zotify
		</button>

		<button class="actionBtn secondaryBtn" id="helper-open-folder" ${state.downloadFolder ? "" : "disabled"}>
		  Open Download Folder
		</button>
	  </div>
	</div>

      ${state.error ? `<div class="error">${escapeHtml(state.error)}</div>` : ""}
      ${state.info ? `<div class="ok">${escapeHtml(state.info)}</div>` : ""}
      ${state.commandPreview ? `<div class="section"><pre>${escapeHtml(state.commandPreview)}</pre></div>` : ""}
    `;

    attachEvents(panel);
  }
  

  function attachEvents(panel) {
    panel.querySelector("#helper-close").addEventListener("click", () => {
      closePanel();
    });
	
	panel.querySelector("#helper-kill").addEventListener("click", () => {
	  chrome.runtime.sendMessage(
		{ type: "KILL_ZOTIFY" },
		(response) => {
		  if (chrome.runtime.lastError) {
			state.error = chrome.runtime.lastError.message || "Kill failed.";
			render();
			return;
		  }

		  if (!response?.ok) {
			state.error = response?.error || "Kill failed.";
			render();
			return;
		  }

		  state.info = "Zotify process terminated.";
		  state.error = null;
		  render();
		}
	  );
	});

    panel.querySelector("#helper-format").addEventListener("change", async (e) => {
      state.audioFormat = e.target.value;
      await saveSettings();
    });

    panel.querySelector("#helper-quality").addEventListener("change", async (e) => {
      state.quality = e.target.value;
      await saveSettings();
    });

    panel.querySelector("#helper-output-preset").addEventListener("change", async (e) => {
      state.outputPreset = e.target.value;
      await saveSettings();
    });

    panel.querySelector("#helper-album-library").addEventListener("input", async (e) => {
      state.albumLibrary = e.target.value;
      await saveSettings();
    });

    panel.querySelector("#helper-podcast-library").addEventListener("input", async (e) => {
      state.podcastLibrary = e.target.value;
      await saveSettings();
    });

    panel.querySelector("#helper-playlist-library").addEventListener("input", async (e) => {
      state.playlistLibrary = e.target.value;
      await saveSettings();
    });

    panel.querySelector("#helper-real-time").addEventListener("change", async (e) => {
      state.realTime = e.target.checked;
      await saveSettings();
    });

    panel.querySelector("#helper-lyrics-file").addEventListener("change", async (e) => {
      state.lyricsFile = e.target.checked;
      await saveSettings();
    });

    panel.querySelector("#helper-skip-duplicates").addEventListener("change", async (e) => {
      state.skipDuplicates = e.target.checked;
      await saveSettings();
    });

    panel.querySelector("#helper-save-metadata").addEventListener("change", async (e) => {
      state.saveMetadata = e.target.checked;
      await saveSettings();
    });

    panel.querySelector("#helper-save-genre").addEventListener("change", async (e) => {
      state.saveGenre = e.target.checked;
      await saveSettings();
    });

    panel.querySelector("#helper-playlist-file").addEventListener("change", async (e) => {
      state.playlistFile = e.target.checked;
      await saveSettings();
    });

    panel.querySelector("#helper-print-downloads").addEventListener("change", async (e) => {
      state.printDownloads = e.target.checked;
      await saveSettings();
    });

    panel.querySelector("#helper-print-progress").addEventListener("change", async (e) => {
      state.printProgress = e.target.checked;
      await saveSettings();
    });

    panel.querySelector("#helper-print-skips").addEventListener("change", async (e) => {
      state.printSkips = e.target.checked;
      await saveSettings();
    });

    panel.querySelector("#helper-print-warnings").addEventListener("change", async (e) => {
      state.printWarnings = e.target.checked;
      await saveSettings();
    });

    panel.querySelector("#helper-print-errors").addEventListener("change", async (e) => {
      state.printErrors = e.target.checked;
      await saveSettings();
    });

	panel.querySelector("#helper-run").addEventListener("click", () => {
	  try {
		state.error = null;
		state.info = null;

		if (!state.pageType) {
		  throw new Error("Open a Spotify album, playlist, or track page first.");
		}

		// Immediately update UI
		state.isRunning = true;
		state.downloadFolder = getExpectedDownloadFolder();
		state.info = "Zotify started. Open download folder to check progress.";
		render();

		// Fire and forget
		chrome.runtime.sendMessage({
		  type: "RUN_ZOTIFY",
		  payload: buildPayload()
		}, () => {
		  // We deliberately ignore response completely
		  // This avoids undefined return codes and timing issues
		});

	  } catch (error) {
		state.error = error?.message || "Unexpected error.";
		state.info = null;
		state.isRunning = false;
		render();
	  }
	});

    panel.querySelector("#helper-copy").addEventListener("click", async () => {
      try {
        const payload = buildPayload();

        chrome.runtime.sendMessage(
          {
            type: "BUILD_ZOTIFY_COMMAND",
            payload
          },
          async (response) => {
            if (chrome.runtime.lastError) {
              state.error = chrome.runtime.lastError.message || "Runtime messaging error.";
              state.info = null;
              render();
              return;
            }

            if (!response?.ok) {
              state.error = response?.error || "Failed to build zotify command.";
              state.info = null;
              render();
              return;
            }

            state.commandPreview = response.commandPreview || "";
            await navigator.clipboard.writeText(state.commandPreview);
            state.info = "Command copied to clipboard.";
            state.error = null;
            render();
          }
        );
      } catch (error) {
        state.error = error?.message || "Copy failed.";
        state.info = null;
        render();
      }
    });

    const openFolderBtn = panel.querySelector("#helper-open-folder");
    if (openFolderBtn) {
      openFolderBtn.addEventListener("click", () => {
        if (!state.downloadFolder) {
          state.error = "No download folder is available yet.";
          render();
          return;
        }

        chrome.runtime.sendMessage(
          {
            type: "OPEN_DOWNLOAD_FOLDER",
            folderPath: state.downloadFolder
          },
          (response) => {
            if (chrome.runtime.lastError) {
              state.error = chrome.runtime.lastError.message || "Could not open folder.";
              render();
              return;
            }

            if (!response?.ok) {
              state.error = response?.error || "Could not open folder.";
              render();
              return;
            }

            state.info = "Download folder opened.";
            state.error = null;
            render();
          }
        );
      });
    }
  }

  function render() {
    const parsed = parseSpotifyUrl(location.href);

    if (!parsed || state.isClosed) {
      const existing = document.getElementById(PANEL_ID);
      if (existing) existing.remove();
      return;
    }

    state.pageType = parsed.type;
    state.pageId = parsed.id;
    state.title = getPageTitle();
    state.accountType = detectAccountType();

    injectStyles();
    buildPanel();
  }

  function observeNavigation() {
    let lastUrl = location.href;

    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        state.error = null;
        state.info = null;
        state.commandPreview = "";
        state.downloadFolder = "";
        state.isRunning = false;
        ensurePanelCanOpen();
        render();
      }
    });

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    window.addEventListener("popstate", () => {
      state.error = null;
      state.info = null;
      state.commandPreview = "";
      state.downloadFolder = "";
      state.isRunning = false;
      ensurePanelCanOpen();
      render();
    });
  }

  async function init() {
    await loadSettings();
    render();
    observeNavigation();
  }

  init();
})();