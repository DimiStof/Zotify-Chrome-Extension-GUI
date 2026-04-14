chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) {
    sendResponse({ ok: false, error: "Invalid message." });
    return true;
  }
  
	  if (message.type === "KILL_ZOTIFY") {
	  chrome.runtime.sendNativeMessage(
		"com.dimi.zotify_runner",
		{ action: "kill_zotify" },
		(nativeResponse) => {
		  if (chrome.runtime.lastError) {
			sendResponse({
			  ok: false,
			  error: chrome.runtime.lastError.message
			});
			return;
		  }

		  if (!nativeResponse?.ok) {
			sendResponse({
			  ok: false,
			  error: nativeResponse?.error || "Kill failed."
			});
			return;
		  }

		  sendResponse({ ok: true });
		}
	  );

	  return true;
	}

  if (message.type === "BUILD_ZOTIFY_COMMAND" || message.type === "RUN_ZOTIFY" || message.type === "OPEN_DOWNLOAD_FOLDER") {
    try {
      if (message.type === "OPEN_DOWNLOAD_FOLDER") {
        chrome.runtime.sendNativeMessage(
          "com.dimi.zotify_runner",
          {
            action: "open_folder",
            folderPath: message.folderPath || ""
          },
          (nativeResponse) => {
            if (chrome.runtime.lastError) {
              sendResponse({
                ok: false,
                error: chrome.runtime.lastError.message
              });
              return;
            }

            if (!nativeResponse?.ok) {
              sendResponse({
                ok: false,
                error: nativeResponse?.error || "Could not open folder."
              });
              return;
            }

            sendResponse({
              ok: true
            });
          }
        );
        return true;
      }

      const payload = message.payload || {};
      const options = payload.options || {};

      const targetUrl = payload.targetUrl || "";
      const quality = options.quality || "auto";
      const audioFormat = options.audioFormat || "mp3";
      const realTime = Boolean(options.realTime);
      const lyricsFile = Boolean(options.lyricsFile);
      const skipDuplicates = Boolean(options.skipDuplicates);
      const saveMetadata = Boolean(options.saveMetadata);
      const saveGenre = Boolean(options.saveGenre);
      const playlistFile = Boolean(options.playlistFile);
      const printDownloads = Boolean(options.printDownloads);
      const printProgress = Boolean(options.printProgress);
      const printSkips = Boolean(options.printSkips);
      const printWarnings = Boolean(options.printWarnings);
      const printErrors = options.printErrors !== false;

      const albumLibrary = (options.albumLibrary || "").trim();
      const podcastLibrary = (options.podcastLibrary || "").trim();
      const playlistLibrary = (options.playlistLibrary || "").trim();
      const outputPreset = options.outputPreset || "playlist";

      const commandArray = ["zotify"];

      if (targetUrl) {
        commandArray.push(targetUrl);
      }

      commandArray.push(`--download-quality=${quality}`);
      commandArray.push(`--audio-format=${audioFormat}`);

      if (realTime) commandArray.push("--download-real-time");
      if (lyricsFile) commandArray.push("--lyrics-file");
      if (skipDuplicates) commandArray.push("--skip-duplicates");
      if (saveMetadata) commandArray.push("--save-metadata");
      if (saveGenre) commandArray.push("--save-genre");
      if (playlistFile) commandArray.push("--playlist-file");
      if (printDownloads) commandArray.push("--print-downloads");
      if (printProgress) commandArray.push("--print-progress");
      if (printSkips) commandArray.push("--print-skips");
      if (printWarnings) commandArray.push("--print-warnings");
      if (printErrors) commandArray.push("--print-errors");

      if (albumLibrary) {
        commandArray.push("--album-library", albumLibrary);
      }

      if (podcastLibrary) {
        commandArray.push("--podcast-library", podcastLibrary);
      }

      if (playlistLibrary) {
        commandArray.push("--playlist-library", playlistLibrary);
      }

      if (outputPreset === "playlist") {
        commandArray.push(
          "--output-playlist-track",
          "{playlist}/{playlist_number}. {artists} - {title}"
        );
      } else if (outputPreset === "artist_album") {
        commandArray.push(
          "--output-album",
          "{album_artist}/{album}/{track_number}. {artists} - {title}"
        );
      }

      const commandPreview = commandArray.map(quoteArg).join(" ");

      if (message.type === "BUILD_ZOTIFY_COMMAND") {
        sendResponse({
          ok: true,
          simulated: true,
          commandArray,
          commandPreview
        });
        return true;
      }

      chrome.runtime.sendNativeMessage(
        "com.dimi.zotify_runner",
        {
          action: "run_zotify",
          command: commandArray
        },
        (nativeResponse) => {
          if (chrome.runtime.lastError) {
            sendResponse({
              ok: false,
              error: chrome.runtime.lastError.message,
              commandPreview
            });
            return;
          }

          if (!nativeResponse?.ok) {
            sendResponse({
              ok: false,
              error: nativeResponse?.error || "Zotify failed.",
              commandPreview
            });
            return;
          }

          sendResponse({
            ok: true,
            finished: true,
            returncode: nativeResponse.returncode,
            stdout: nativeResponse.stdout || "",
            stderr: nativeResponse.stderr || "",
            commandPreview
          });
        }
      );

      return true;
    } catch (error) {
      sendResponse({
        ok: false,
        error: error?.message || "Failed to build or run zotify command."
      });
      return true;
    }
  }

  if (message.type === "SAVE_SETTINGS") {
    chrome.storage.local.set({ spotifyHelperSettings: message.payload || {} }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === "LOAD_SETTINGS") {
    chrome.storage.local.get(["spotifyHelperSettings"], (result) => {
      sendResponse({
        ok: true,
        settings: result.spotifyHelperSettings || {}
      });
    });
    return true;
  }

  sendResponse({ ok: false, error: "Unknown message type." });
  return true;
});

function quoteArg(value) {
  const str = String(value);
  return /[\s"]/g.test(str) ? `"${str.replace(/"/g, '\\"')}"` : str;
}