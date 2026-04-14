Been a longtime Zotify user and thought for a while about making an updated GUI app!

A Hassle-Free way to do this is by installing the Chrome Extension by enabling developer mode, loading unpacked and choosing the folder etc. But this method would have you copy-pasting the commands into zotify through a cmd window or whatever.

The method to fully automate it requires the following:

0. Do all the above and test the extension to ensure its working.
1. For simplicity, Place the files on C:, with the foldername ZSpotifyGUIFull, you don't have to but you'll need to change the file paths in the Hosts folder where applicable
2. In com.dimi.zotify_runner.json : ensure path of "C:\ZSpotifyGUIFull\Hosts\run_zotify_host.cmd" is correct or change if needed & get the Chrome extension ID from chrome://extensions/ for Zotify Web GUI and paste it at "chrome-extension://HERE/", replacing HERE
3. In install_native_host.reg, ensure C:\ZSpotifyGUIFull\Hosts\com.dimi.zotify_runner.json is pointing to the correct directory
4. In run_zotify_host.cmd, ensure "C:\Users\USER\scoop\apps\python\current\python.exe" is pointing towards your python exe, use the 'where python' command in cmd and choose the first option to find this directory. also ensure "C:\ZSpotifyGUIFull\Hosts\zotify_native_host.py" points to the right directory.
5. Launch install_native_host.reg and press yes to any prompts.
That should be it but it's possible I missed something, if I did, let me know! Enjoy.
